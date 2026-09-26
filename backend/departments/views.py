from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .models import Department
from .serializers import DepartmetSerializer

class DepartmentView(APIView):
    def get(self, request, pk=None):
        if pk:
            try:
                department = Department.objects.get(pk=pk)
                serializer = DepartmetSerializer(department)
                return Response(serializer.data, status=status.HTTP_200_OK)
            except Department.DoesNotExist:
                return Response({"error": "not found"}, status=status.HTTP_404_NOT_FOUND)

        else:
            department = Department.objects.all()
            serializer = DepartmetSerializer(department, many=True)
