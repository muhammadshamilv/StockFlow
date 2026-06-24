from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from django.db.models import Sum

from .models import Category, Product, InventoryTransaction, Sale
from .serializers import CategorySerializer, ProductSerializer, InventoryTransactionSerializer, SaleSerializer


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


@api_view(["PUT", "DELETE"])
def category_detail(request, pk):
    try:
        category = Category.objects.get(pk=pk)
    except Category.DoesNotExist:

        return Response(
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == "DELETE":
        category.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )

    serializer = CategorySerializer(
        category,
        data=request.data
    )

    if serializer.is_valid():
        serializer.save()

        return Response(
            serializer.data
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


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
    total_transactions = InventoryTransaction.objects.count()
    total_quantity = (
        Product.objects.aggregate(
            total=Sum("quantity")
        )["total"] or 0
    )
    inventory_value = 0
    products = Product.objects.all()
    low_stock_count = 0
    out_of_stock_count = 0

    for product in products:
        inventory_value += (
            float(product.price)
            * product.quantity
        )

        if product.quantity <= 5:
            low_stock_count += 1
        if product.quantity == 0:
            out_of_stock_count += 1

    stock_in_count = InventoryTransaction.objects.filter(
        transaction_type="IN"
    ).count()

    stock_out_count = InventoryTransaction.objects.filter(
        transaction_type="OUT"
    ).count()

    recent_products = Product.objects.order_by(
        "-created_at"
    )[:5]

    recent_product_data = []

    for product in recent_products:

        recent_product_data.append({
            "id": product.id,
            "name": product.name,
            "quantity": product.quantity
        })

    recent_transactions = InventoryTransaction.objects.order_by(
        "-created_at"
    )[:5]

    recent_data = []

    for transaction in recent_transactions:
        recent_data.append({
            "product": transaction.product.name,
            "type": transaction.transaction_type,
            "quantity": transaction.quantity
        })

    return Response({
        "total_products": total_products,
        "total_categories": total_categories,
        "total_quantity": total_quantity,
        "inventory_value": inventory_value,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "total_transactions": total_transactions,
        "stock_in_count": stock_in_count,
        "stock_out_count": stock_out_count,
        "recent_products": recent_product_data,
        "recent_transactions": recent_data
    })


@api_view(["GET", "POST"])
def transaction_list(request):

    if request.method == "GET":
        transactions = InventoryTransaction.objects.order_by(
            "-created_at"
        )
        serializer = InventoryTransactionSerializer(
            transactions,
            many=True
        )

        return Response(
            serializer.data
        )

    serializer = InventoryTransactionSerializer(
        data=request.data
    )

    if serializer.is_valid():
        transaction = serializer.save()
        product = transaction.product

        if transaction.transaction_type == "IN":
            product.quantity += transaction.quantity
        else:
            product.quantity -= transaction.quantity

        product.save()

        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED
        )

    return Response(
        serializer.errors,
        status=status.HTTP_400_BAD_REQUEST
    )


@api_view(["GET", "POST"])
def sales_list(request):

    if request.method == "GET":
        sales = Sale.objects.order_by(
            "-created_at"
        )
        serializer = SaleSerializer(
            sales,
            many=True
        )

        return Response(
            serializer.data
        )

    product_id = request.data.get(
        "product"
    )
    quantity = int(
        request.data.get("quantity")
    )
    product = Product.objects.get(
        id=product_id
    )

    if quantity > product.quantity:

        return Response(
            {
                "error":
                "Insufficient stock"
            },
            status=400
        )

    total_amount = (
        product.price * quantity
    )
    sale = Sale.objects.create(
        product=product,
        quantity=quantity,
        unit_price=product.price,
        total_amount=total_amount
    )
    product.quantity -= quantity
    product.save()
    InventoryTransaction.objects.create(
        product=product,
        transaction_type="OUT",
        quantity=quantity
    )
    serializer = SaleSerializer(
        sale
    )

    return Response(
        serializer.data,
        status=201
    )
