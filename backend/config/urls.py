from django.contrib import admin  # pyright: ignore[reportMissingImports]
from django.http import JsonResponse  # pyright: ignore[reportMissingImports]
from django.urls import include, path  # pyright: ignore[reportMissingImports]


def api_root(request):
    return JsonResponse({
        'name': 'Tetrinimo API',
        'status': 'ok',
        'game': 'http://localhost:5173',
        'endpoints': {
            'auth': '/api/auth/',
            'scores': '/api/scores/',
            'admin': '/admin/',
        },
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
]
