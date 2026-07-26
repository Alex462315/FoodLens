"""
FoodLens — Project-level views
"""
from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(['GET'])
def health_check(request):
    """
    Simple health check endpoint.
    Returns 200 OK with status info to verify the backend
    is running and connected to the database.
    """
    from django.db import connection

    db_status = 'connected'
    try:
        connection.ensure_connection()
    except Exception as e:
        db_status = f'error: {str(e)}'

    return Response({
        'status': 'ok',
        'service': 'FoodLens API',
        'version': '1.0.0',
        'database': db_status,
    })
