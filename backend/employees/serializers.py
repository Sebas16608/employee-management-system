from rest_framework import serializers

from departments.models import Department
from .models import Employee

from departments.serializers import DepartmentSerializer

class EmployeeSerializer(serializers.ModelSerializer):
    department = DepartmentSerializer(read_only=True)
    department_id = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), source="department", write_only=True)
    class Meta:
        model = Employee
        fields = ["id","code", "name", "last_name", "birthdate", "department", "department_id"]
        read_only_fields = ["id", "code"]
