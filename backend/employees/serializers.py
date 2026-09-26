from rest_framework import serializers
from .models import Employee

class EmployeeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Employee
        fields = ["id","code", "name", "last_name", "birthdate", "department"]
        read_only_fields = ["id", "code"]
