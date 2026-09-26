from rest_framework import serializers
from .models import Department

class DepartmetoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "code", "name", "description"]
