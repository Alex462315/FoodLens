from django.contrib.auth.models import User
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers


class RegisterSerializer(serializers.Serializer):
    """
    Serializer for user registration.
    Validates username/email uniqueness and password strength.
    """
    username = serializers.CharField(
        max_length=150,
        help_text='Required. 150 characters or fewer.',
    )
    email = serializers.EmailField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )
    password2 = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
        help_text='Confirm password — must match the password field.',
    )

    def validate_username(self, value):
        """Ensure username is unique."""
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('A user with this username already exists.')
        return value

    def validate_email(self, value):
        """Ensure email is unique."""
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('A user with this email already exists.')
        return value

    def validate(self, attrs):
        """Cross-field validation: passwords must match and pass Django validators."""
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({
                'password': 'Passwords do not match.'
            })
        # Run Django's built-in password validators
        validate_password(attrs['password'])
        return attrs

    def create(self, validated_data):
        """Create and return the new User (password is hashed automatically)."""
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
        )
        return user


class LoginSerializer(serializers.Serializer):
    """
    Serializer for user login.
    Authenticates against Django's built-in auth system.
    """
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        style={'input_type': 'password'},
    )

    def validate(self, attrs):
        """Authenticate the user with the provided credentials."""
        from django.contrib.auth import authenticate

        user = authenticate(
            username=attrs['username'],
            password=attrs['password'],
        )
        if user is None:
            raise serializers.ValidationError('Invalid credentials.')
        if not user.is_active:
            raise serializers.ValidationError('This account has been disabled.')
        attrs['user'] = user
        return attrs

