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
