from rest_framework import serializers
from .models import Department

class DepartmetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Department
        fields = ["id", "code", "name", "description"]
