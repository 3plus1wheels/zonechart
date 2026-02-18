from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Item
from .serializers import ItemSerializer

# Create your views here.

class ItemViewSet(viewsets.ModelViewSet):
    queryset = Item.objects.all()
    serializer_class = ItemSerializer

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active items"""
        active_items = Item.objects.filter(is_active=True)
        serializer = self.get_serializer(active_items, many=True)
        return Response(serializer.data)
