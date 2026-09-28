"""
Accounts app — Registration (Step 1) and Login (Step 2) views.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.authtoken.models import Token

from .serializers import RegisterSerializer, LoginSerializer


@api_view(['POST'])
@permission_classes([AllowAny])
def register_view(request):
    """
    POST /api/auth/register/

    Create a new user account. On success, returns 201 with user info
    and an auth token so the user is immediately logged in.
    """
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()
        # Create an auth token so the user is immediately logged in
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'token': token.key,
            },
            status=status.HTTP_201_CREATED,
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    POST /api/auth/login/

    Authenticate a user. On success, returns 200 with user info and
    their existing DRF auth token (reuses the same token, doesn't
    generate a new one on every login).

    On failure, returns 401 with a generic "Invalid credentials" message
    — does not reveal whether the username or password was wrong.
    """
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        # Reuse existing token (created during registration)
        token, _ = Token.objects.get_or_create(user=user)
        return Response(
            {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'token': token.key,
            },
            status=status.HTTP_200_OK,
        )
    return Response(
        {'detail': 'Invalid credentials.'},
        status=status.HTTP_401_UNAUTHORIZED,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_login_view(request):
    """
    POST /api/auth/google/

    Accepts a Google ID token from the mobile app, verifies it with Google,
    and either creates a new user or logs in the existing one.

    Request body:
        { "id_token": "<google-id-token>" }

    Response (same format as login_view):
        { "id", "username", "email", "is_staff", "token" }
    """
    import os
    from google.oauth2 import id_token as google_id_token
    from google.auth.transport import requests as google_requests

    raw_token = request.data.get('id_token', '').strip()
    if not raw_token:
        return Response(
            {'error': 'id_token is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    web_client_id = os.getenv('GOOGLE_WEB_CLIENT_ID', '').strip()
    android_client_id = os.getenv('GOOGLE_ANDROID_CLIENT_ID', '').strip()

    if not web_client_id:
        return Response(
            {'error': 'Google Sign-In is not configured on the server.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Try verifying against both web and android client IDs.
    # Also allow 5-min clock skew to fix first-click token expiry errors.
    client_ids_to_try = [cid for cid in [web_client_id, android_client_id] if cid]
    idinfo = None
    last_error = None
    google_request = google_requests.Request()

    for client_id in client_ids_to_try:
        try:
            idinfo = google_id_token.verify_oauth2_token(
                raw_token,
                google_request,
                client_id,
                clock_skew_in_seconds=300,
            )
            break
        except ValueError as e:
            last_error = e
            idinfo = None

    if idinfo is None:
        import logging
        logging.getLogger(__name__).warning('Google token verify failed: %s', last_error)
        return Response(
            {'error': 'Invalid Google token. Please try signing in again.'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    # Extract user info from Google's verified token
    email = idinfo.get('email', '')
    name = idinfo.get('name', '')
    given_name = idinfo.get('given_name', '')

    if not email:
        return Response(
            {'error': 'Google account does not have an email.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Create or get the user
    from django.contrib.auth.models import User
    import uuid

    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email.split('@')[0] + '_' + uuid.uuid4().hex[:4],
            'first_name': given_name or name,
        },
    )

    if created:
        # Set an unusable password for Google-only users
        user.set_unusable_password()
        user.save()

    # Get or create auth token
    auth_token, _ = Token.objects.get_or_create(user=user)

    return Response(
        {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'is_staff': user.is_staff,
            'token': auth_token.key,
        },
        status=status.HTTP_200_OK,
    )


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_username_view(request):
    """
    PUT /api/auth/update-username/

    Allows an authenticated user to change their username.

    Request body:
        { "username": "<new-username>" }

    Returns updated user info (same format as login_view).
    """
    import re
    from django.contrib.auth.models import User

    new_username = request.data.get('username', '').strip()

    if not new_username:
        return Response(
            {'error': 'Username is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate length
    if len(new_username) < 3 or len(new_username) > 30:
        return Response(
            {'error': 'Username must be 3–30 characters long.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Validate characters (alphanumeric, underscores, dots, hyphens)
    if not re.match(r'^[a-zA-Z0-9._-]+$', new_username):
        return Response(
            {'error': 'Username can only contain letters, numbers, dots, hyphens, and underscores.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check if the new username is the same as current
    if request.user.username == new_username:
        return Response(
            {'error': 'New username is the same as your current one.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Check uniqueness (case-insensitive)
    if User.objects.filter(username__iexact=new_username).exclude(pk=request.user.pk).exists():
        return Response(
            {'error': 'This username is already taken.'},
            status=status.HTTP_409_CONFLICT,
        )

    # Update
    request.user.username = new_username
    request.user.save()

    token, _ = Token.objects.get_or_create(user=request.user)
    return Response(
        {
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'is_staff': request.user.is_staff,
            'token': token.key,
        },
        status=status.HTTP_200_OK,
    )
