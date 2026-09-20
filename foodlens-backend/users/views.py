"""
Users app — views.

Three endpoints:
  POST /api/users/forgot-password/   (public)  — request OTP via email
  POST /api/users/reset-password/    (public)  — consume OTP, set new password
  POST /api/users/change-password/   (Token)   — change password while logged in
"""
import random
import string

from django.contrib.auth.models import User
from django.contrib.auth.hashers import make_password, check_password
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from .models import PasswordResetOTP


# ─── helpers ──────────────────────────────────────────────────────────────────

def _generate_otp() -> str:
    """Return a random 6-digit numeric string."""
    return ''.join(random.choices(string.digits, k=6))


def _invalidate_previous_otps(user: User) -> None:
    """Mark all existing unused OTPs for this user as used before creating a new one."""
    PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)


# ─── A.1 · Forgot Password (OTP) ─────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password(request):
    """
    POST /api/users/forgot-password/
    Body: { "email": "user@example.com" }

    Always returns a generic 200 success message — even if the email is not
    registered — so that attackers cannot enumerate valid accounts.

    If the email IS registered:
    - Any previous unused OTPs are invalidated.
    - A fresh 6-digit OTP is generated and stored (hashed).
    - The raw code is sent via the console email backend (check terminal output).

    To switch to real SMTP later, update settings.py:
        EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
        EMAIL_HOST = 'smtp.gmail.com'
        EMAIL_PORT = 587
        EMAIL_USE_TLS = True
        EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER')
        EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD')
    """
    email = request.data.get('email', '').strip().lower()

    if email:
        try:
            user = User.objects.get(email__iexact=email)
            raw_otp = _generate_otp()
            _invalidate_previous_otps(user)

            PasswordResetOTP.objects.create(
                user=user,
                otp_code=make_password(raw_otp),
            )

            # Send OTP — currently via console backend (appears in Django terminal).
            # Replace EMAIL_BACKEND in settings.py to send real emails in production.
            send_mail(
                subject='FoodLens — Your Password Reset Code',
                message=(
                    f'Hi {user.username},\n\n'
                    f'Your FoodLens password reset code is:\n\n'
                    f'  {raw_otp}\n\n'
                    f'This code is valid for 10 minutes. '
                    f'If you did not request a reset, you can safely ignore this email.\n\n'
                    f'— FoodLens Team'
                ),
                from_email='noreply@foodlens.app',
                recipient_list=[user.email],
                fail_silently=True,  # Don't raise if mail backend is not configured
            )
        except User.DoesNotExist:
            pass  # Do nothing — return same generic response below

    # Always return the same message regardless of whether the email exists.
    return Response(
        {'detail': 'If that email is registered, a reset code has been sent.'},
        status=status.HTTP_200_OK,
    )


# ─── A.1 · Reset Password (consume OTP) ──────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password(request):
    """
    POST /api/users/reset-password/
    Body: { "email": "", "otp": "", "new_password": "", "new_password2": "" }

    Specific errors are acceptable here: the user has already proved they
    own the email address by receiving the OTP, so we can tell them what
    went wrong (expired code, wrong code, password mismatch, etc.).
    """
    email        = request.data.get('email', '').strip().lower()
    raw_otp      = request.data.get('otp', '').strip()
    new_password = request.data.get('new_password', '')
    new_password2 = request.data.get('new_password2', '')

    # 1. Basic field validation
    if not all([email, raw_otp, new_password, new_password2]):
        return Response(
            {'detail': 'All fields are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Password match check
    if new_password != new_password2:
        return Response(
            {'detail': 'Passwords do not match.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 3. Find user
    try:
        user = User.objects.get(email__iexact=email)
    except User.DoesNotExist:
        return Response(
            {'detail': 'Invalid or expired reset code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 4. Find the most recent unused, non-expired OTP
    otp_obj = (
        PasswordResetOTP.objects
        .filter(user=user, is_used=False)
        .order_by('-created_at')
        .first()
    )

    if otp_obj is None or not otp_obj.is_valid:
        return Response(
            {'detail': 'Reset code has expired. Please request a new one.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 5. Verify the raw OTP against the stored hash
    if not check_password(raw_otp, otp_obj.otp_code):
        return Response(
            {'detail': 'Incorrect reset code.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 6. Validate new password through Django's standard validators
    try:
        validate_password(new_password, user=user)
    except ValidationError as e:
        return Response(
            {'detail': ' '.join(e.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 7. Apply the new password and mark OTP consumed
    user.set_password(new_password)
    user.save()
    otp_obj.is_used = True
    otp_obj.save()

    # 8. Invalidate ALL auth tokens so old sessions are killed after a reset
    from rest_framework.authtoken.models import Token
    Token.objects.filter(user=user).delete()

    return Response(
        {'detail': 'Password reset successful. Please log in with your new password.'},
        status=status.HTTP_200_OK,
    )


# ─── A.2 · Change Password (logged-in user) ──────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """
    POST /api/users/change-password/
    Headers: Authorization: Token <token>
    Body: { "current_password": "", "new_password": "", "new_password2": "" }

    The user is already authenticated (Token header), but they must still
    prove they know the *current* password. This protects against an
    attacker who finds a logged-in device — being logged in is not enough.
    """
    current_password = request.data.get('current_password', '')
    new_password     = request.data.get('new_password', '')
    new_password2    = request.data.get('new_password2', '')

    # 1. Field validation
    if not all([current_password, new_password, new_password2]):
        return Response(
            {'detail': 'All fields are required.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 2. Verify current password
    if not request.user.check_password(current_password):
        return Response(
            {'detail': 'Current password is incorrect.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 3. Password match check
    if new_password != new_password2:
        return Response(
            {'detail': 'New passwords do not match.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 4. Disallow reusing the same password
    if current_password == new_password:
        return Response(
            {'detail': 'New password must be different from the current password.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 5. Run Django's standard password validators
    try:
        validate_password(new_password, user=request.user)
    except ValidationError as e:
        return Response(
            {'detail': ' '.join(e.messages)},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # 6. Apply the new password — stay logged in (don't delete the token)
    request.user.set_password(new_password)
    request.user.save()

    return Response(
        {'detail': 'Password changed successfully.'},
        status=status.HTTP_200_OK,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# PART C — Admin Analytics (is_staff only)
# ═══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_analytics_view(request):
    """
    GET /api/admin/analytics/

    Aggregate stats across ALL users. Requires is_staff=True, else 403.

    Response:
        {
            "total_users": 42,
            "total_scans": 310,
            "risk_level_distribution": { "low": 120, "moderate": 140, "high": 50 },
            "most_flagged_ingredients": [
                { "name": "Sugar", "flagged_count": 89 },
                { "name": "Palm Oil", "flagged_count": 54 }
            ]
        }
    """
    # ── Staff gate ────────────────────────────────────────────────────────────
    if not request.user.is_staff:
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    from django.contrib.auth.models import User as DjangoUser
    from django.db.models import Count
    from scoring.models import ScoredResult, ScoredIngredientDetail

    total_users = DjangoUser.objects.count()
    total_scans = ScoredResult.objects.count()

    # Risk-level distribution across ALL scans
    dist_qs = (
        ScoredResult.objects
        .values('risk_label')
        .annotate(count=Count('id'))
    )
    dist = {'low': 0, 'moderate': 0, 'high': 0}
    for row in dist_qs:
        label = (row['risk_label'] or '').lower()
        if label in dist:
            dist[label] = row['count']

    # Most flagged ingredients across ALL users — top 15
    flagged_qs = (
        ScoredIngredientDetail.objects
        .filter(ingredient__isnull=False)
        .values('ingredient__name')
        .annotate(flagged_count=Count('id'))
        .order_by('-flagged_count')[:15]
    )
    most_flagged = [
        {'name': f['ingredient__name'], 'flagged_count': f['flagged_count']}
        for f in flagged_qs
    ]

    return Response({
        'total_users':              total_users,
        'total_scans':              total_scans,
        'risk_level_distribution':  dist,
        'most_flagged_ingredients': most_flagged,
    }, status=status.HTTP_200_OK)


# ─── Admin: List Users ────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_users_list(request):
    """
    GET /api/admin/users/

    Returns all registered users with details. Requires is_staff=True.
    """
    if not request.user.is_staff:
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    from django.contrib.auth.models import User as DjangoUser
    from django.db.models import Count
    from scoring.models import ScoredResult

    users = DjangoUser.objects.all().order_by('-date_joined')

    # Pre-fetch scan counts per user
    scan_counts = dict(
        ScoredResult.objects
        .values_list('profile__user_id')
        .annotate(count=Count('id'))
        .values_list('profile__user_id', 'count')
    )

    result = []
    for u in users:
        result.append({
            'id':           u.id,
            'username':     u.username,
            'email':        u.email,
            'is_staff':     u.is_staff,
            'is_active':    u.is_active,
            'date_joined':  u.date_joined.isoformat(),
            'last_login':   u.last_login.isoformat() if u.last_login else None,
            'scan_count':   scan_counts.get(u.id, 0),
        })

    return Response(result, status=status.HTTP_200_OK)


# ─── Admin: Delete User ──────────────────────────────────────────────────────

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def admin_delete_user(request, user_id):
    """
    DELETE /api/admin/users/<user_id>/

    Deletes a user account. Requires is_staff=True.
    Safety checks:
    - Cannot delete yourself.
    - Cannot delete other staff/admin users (prevents accidental lockout).
    """
    if not request.user.is_staff:
        return Response(
            {'detail': 'Admin access required.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    from django.contrib.auth.models import User as DjangoUser

    try:
        target_user = DjangoUser.objects.get(id=user_id)
    except DjangoUser.DoesNotExist:
        return Response(
            {'detail': 'User not found.'},
            status=status.HTTP_404_NOT_FOUND,
        )

    # Safety: don't let admin delete themselves
    if target_user.id == request.user.id:
        return Response(
            {'detail': 'You cannot delete your own account.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Safety: don't let admin delete other staff users
    if target_user.is_staff:
        return Response(
            {'detail': 'Cannot delete another admin/staff user.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    username = target_user.username
    target_user.delete()

    return Response(
        {'detail': f'User "{username}" has been deleted.'},
        status=status.HTTP_200_OK,
    )
