"""
Accounts app — Registration (Step 1) and Login (Step 2) views.
"""
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
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
                'is_staff': user.is_staff,
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
                'is_staff': user.is_staff,
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

    token = request.data.get('id_token', '').strip()
    if not token:
        return Response(
            {'error': 'id_token is required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    web_client_id = os.getenv('GOOGLE_WEB_CLIENT_ID', '')
    if not web_client_id:
        return Response(
            {'error': 'Google Sign-In is not configured on the server.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    # Verify the ID token with Google
    try:
        idinfo = google_id_token.verify_oauth2_token(
            token,
            google_requests.Request(),
            web_client_id,
        )
    except ValueError:
        return Response(
            {'error': 'Invalid Google token.'},
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
