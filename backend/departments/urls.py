from django.urls import path
from .views import DepartmentView

urlpatterns = [
    path("department/", DepartmentView.as_view(), name="department-list"),
    path("department/<int:pk>/", DepartmentView.as_view(), name="department-detail"),
]
