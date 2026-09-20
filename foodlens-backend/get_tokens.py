import django, os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'foodlens.settings')
django.setup()

from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token

users = User.objects.all()
if not users.exists():
    print("No users in database yet.")
else:
    for u in users:
        try:
            token = Token.objects.get(user=u)
            print(f"Email   : {u.email}")
            print(f"Username: {u.username}")
            print(f"Token   : {token.key}")
            print("---")
        except Token.DoesNotExist:
            # Create token on the fly
            token = Token.objects.create(user=u)
            print(f"Email   : {u.email}")
            print(f"Username: {u.username}")
            print(f"Token   : {token.key}  (freshly created)")
            print("---")
