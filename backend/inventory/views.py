from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Sum

from .models import Category, Product
from .serializers import CategorySerializer, ProductSerializer


@api_view(["GET", "POST"])
def category_list(request):
    if request.method == "GET":
        categories = Category.objects.all()
        serializer = CategorySerializer(categories, many=True)

        return Response(serializer.data)

    serializer = CategorySerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET", "POST"])
def product_list(request):
    if request.method == "GET":
        products = Product.objects.all()
        serializer = ProductSerializer(products, many=True)

        return Response(serializer.data)

    serializer = ProductSerializer(data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["PUT", "DELETE"])
def product_detail(request, pk):
    try:
        product = Product.objects.get(pk=pk)
    except Product.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == "DELETE":
        product.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

    serializer = ProductSerializer(product, data=request.data)

    if serializer.is_valid():
        serializer.save()

        return Response(serializer.data)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(["GET"])
def dashboard_stats(request):
    total_products = Product.objects.count()
    total_categories = Category.objects.count()
    total_quantity = (
        Product.objects.aggregate(
            total=Sum("quantity")
        )["total"] or 0
    )

    inventory_value = 0
    products = Product.objects.all()

    for product in products:
        inventory_value += (
            float(product.price) * product.quantity
        )

    return Response({
        "total_products": total_products,
        "total_categories": total_categories,
        "total_quantity": total_quantity,
        "inventory_value": inventory_value,
    })
