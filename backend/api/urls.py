from django.urls import path, include

urlpatterns = [
    path('', include("departments.urls")),
    path('', include("employees.urls")),
]
