"""
Users app — models.

PasswordResetOTP: stores a 6-digit one-time password used in the
forgot-password flow. The raw code is never saved — only its hash.
"""
from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta


class PasswordResetOTP(models.Model):
    """
    Stores a single OTP for a user's password-reset request.

    Security notes:
    - otp_code stores the HASHED value (via Django's make_password).
      The raw 6-digit code is only ever held in memory and sent by email.
    - expires_at is set to created_at + 10 minutes.
    - is_used is flipped to True once the code is successfully consumed,
      preventing replay attacks.
    - On each new forgot-password request any previous unused OTPs for
      that user are invalidated (is_used=True) before the new one is created.
    """

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='password_reset_otps',
    )
    otp_code = models.CharField(
        max_length=128,
        help_text='Hashed 6-digit OTP — never store the raw code.',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Password Reset OTP'
        verbose_name_plural = 'Password Reset OTPs'

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(minutes=10)
        super().save(*args, **kwargs)

    @property
    def is_valid(self):
        """Returns True if the OTP has not been used and has not expired."""
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self):
        return f'OTP for {self.user.email} (used={self.is_used})'
