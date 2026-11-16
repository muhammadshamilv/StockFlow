"""
Populate StockFlow with realistic demo data for screenshots & demos.

    python manage.py seed_demo                 # 90 days of history
    python manage.py seed_demo --reset         # wipe business data first
    python manage.py seed_demo --days 30 --seed 7

Creates demo logins (password for all: Demo@12345):
    admin@stockflow.dev   (ADMIN)
    manager@stockflow.dev (MANAGER)
    staff@stockflow.dev   (STAFF)

All data goes through the real services, so stock, ledger, invoices and
notifications are 100% consistent.
"""

import random
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.catalog import services as catalog
from apps.catalog.models import Category, Product
from apps.inventory import services as inventory
from apps.inventory.models import StockMovement
from apps.notifications.models import Notification
from apps.sales import services as sales
from apps.sales.models import Customer, DocumentSequence, Sale

DEMO_PASSWORD = "Demo@12345"

CATEGORIES = {
    "Electronics": (
        "#3B82F6",
        [
            ("Wireless Mouse", 320, 599),
            ("Mechanical Keyboard", 1850, 2999),
            ("USB-C Cable 1m", 70, 199),
            ("Bluetooth Earbuds", 900, 1799),
            ("Power Bank 10000mAh", 750, 1299),
            ("HDMI Cable 2m", 120, 349),
            ("32GB Pen Drive", 210, 399),
            ("Laptop Stand", 600, 1199),
            ("Webcam 1080p", 1400, 2499),
            ("Smart Plug", 450, 899),
        ],
    ),
    "Groceries": (
        "#22C55E",
        [
            ("Basmati Rice 5kg", 420, 599),
            ("Sunflower Oil 1L", 125, 169),
            ("Toor Dal 1kg", 120, 159),
            ("Green Tea 100 bags", 160, 260),
            ("Instant Coffee 200g", 310, 449),
            ("Wheat Atta 5kg", 190, 265),
            ("Organic Honey 500g", 210, 349),
            ("Almonds 500g", 380, 549),
            ("Sugar 1kg", 38, 52),
            ("Sea Salt 1kg", 18, 28),
        ],
    ),
    "Stationery": (
        "#F59E0B",
        [
            ("A5 Notebook", 35, 80),
            ("Gel Pen Pack (10)", 60, 120),
            ("Sticky Notes", 25, 60),
            ("Highlighter Set", 70, 150),
            ("Desk Organizer", 220, 449),
            ("Printer Paper A4 (500)", 210, 320),
            ("Whiteboard Markers", 80, 160),
            ("Stapler", 90, 180),
            ("Geometry Box", 65, 140),
            ("Sketch Pencils", 45, 99),
        ],
    ),
    "Apparel": (
        "#EC4899",
        [
            ("Cotton T-Shirt", 180, 499),
            ("Denim Jeans", 650, 1499),
            ("Hoodie", 520, 1199),
            ("Running Socks (3)", 90, 249),
            ("Baseball Cap", 120, 349),
            ("Formal Shirt", 420, 999),
            ("Track Pants", 300, 699),
            ("Leather Belt", 210, 549),
            ("Rain Jacket", 700, 1599),
            ("Winter Gloves", 150, 399),
        ],
    ),
    "Home & Kitchen": (
        "#8B5CF6",
        [
            ("Steel Water Bottle", 210, 449),
            ("Non-stick Pan 24cm", 520, 999),
            ("Ceramic Mug Set", 300, 649),
            ("Kitchen Knife Set", 640, 1299),
            ("Storage Jars (6)", 360, 699),
            ("Bedsheet Double", 480, 999),
            ("LED Bulb 9W", 55, 120),
            ("Wall Clock", 260, 599),
            ("Cushion Cover (2)", 140, 349),
            ("Doormat", 120, 299),
        ],
    ),
    "Personal Care": (
        "#14B8A6",
        [
            ("Herbal Shampoo 340ml", 140, 245),
            ("Face Wash 100ml", 95, 175),
            ("Toothpaste 150g", 55, 99),
            ("Body Lotion 400ml", 190, 349),
            ("Hand Sanitizer 500ml", 85, 160),
            ("Sunscreen SPF50", 260, 449),
            ("Electric Trimmer", 950, 1699),
            ("Hair Oil 200ml", 90, 165),
            ("Deodorant", 140, 249),
            ("Lip Balm", 45, 99),
        ],
    ),
}

CUSTOMERS = [
    "Aisha Khan",
    "Rohan Varma",
    "Meera Pillai",
    "Karthik Raj",
    "Neha Sharma",
    "Adil Hussain",
    "Priya Menon",
    "Sanjay Kumar",
    "Divya Nair",
    "Farhan Ali",
    "Lakshmi Iyer",
    "Arun Thomas",
    "Zara Sheikh",
    "Nikhil Rao",
    "Ananya Bose",
    "Joseph Mathew",
    "Sara George",
    "Imran Basheer",
    "Kavya Reddy",
    "Hari Krishnan",
    "Greenleaf Cafe",
    "Bright Minds School",
    "Coastal Hotels Pvt Ltd",
    "Nova Startups LLP",
    "Sunrise Clinic",
]


class Command(BaseCommand):
    help = "Seed realistic demo data (users, catalog, customers, sales history)."

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90)
        parser.add_argument("--seed", type=int, default=42)
        parser.add_argument("--reset", action="store_true", help="Delete existing business data first.")
        parser.add_argument("--no-users", action="store_true", help="Do not create demo user accounts.")

    def handle(self, *args, days, seed, reset, no_users, **options):
        self.rng = random.Random(seed)
        if reset:
            self._reset()
        elif Product.objects.exists():
            self.stdout.write(self.style.WARNING("Data already exists. Re-run with --reset to start fresh."))
            return

        users = self._users(create=not no_users)
        self.admin = users[0]
        start = timezone.localdate() - timedelta(days=days)

        with transaction.atomic():
            products = self._catalog(start)
            customers = self._customers()
        self._history(products, customers, users, start, days)
        self._tidy_notifications()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded {Product.objects.count()} products, {Customer.objects.count()} customers, "
                f"{Sale.objects.count()} sales, {StockMovement.objects.count()} stock movements."
            )
        )
        if not no_users:
            self.stdout.write(
                f"Demo logins (password {DEMO_PASSWORD}): admin@ / manager@ / staff@stockflow.dev"
            )

    # ------------------------------------------------------------------ #
    def _reset(self):
        self.stdout.write("Removing existing business data…")
        with transaction.atomic():
            Notification.objects.all().delete()
            Sale.objects.all().delete()  # cascades SaleItem
            StockMovement.objects.all()._raw_delete(StockMovement.objects.db)  # bypass immutability guard
            Product.objects.all().delete()
            Category.objects.all().delete()
            Customer.objects.all().delete()
            DocumentSequence.objects.all().delete()

    def _users(self, *, create: bool) -> list[User]:
        users = []
        if create:
            for username, role, first, last, title in (
                ("admin", User.Role.ADMIN, "Shamil", "Admin", "Store Owner"),
                ("manager", User.Role.MANAGER, "Maya", "Manager", "Operations Manager"),
                ("staff", User.Role.STAFF, "Sam", "Staff", "Cashier"),
            ):
                user = User.objects.filter(username__iexact=username).first()
                if not user:
                    user = User.objects.create_user(
                        username=username,
                        email=f"{username}@stockflow.dev",
                        password=DEMO_PASSWORD,
                        role=role,
                        first_name=first,
                        last_name=last,
                        job_title=title,
                    )
                users.append(user)
        if not users:
            users = list(User.objects.filter(is_active=True).order_by("id")[:3])
        if not users:
            raise SystemExit("No users found. Run without --no-users or register an account first.")
        return users

    def _catalog(self, start) -> list[Product]:
        products = []
        for cat_name, (color, items) in CATEGORIES.items():
            category = catalog.create_category(name=cat_name, color=color, description=f"{cat_name} products")
            for name, cost, price in items:
                reorder = self.rng.choice([5, 8, 10, 15, 20])
                product = catalog.create_product(
                    user=self.admin,
                    name=name,
                    category=category,
                    cost_price=Decimal(cost),
                    selling_price=Decimal(price),
                    reorder_level=reorder,
                    barcode=f"890{self.rng.randint(1000000000, 9999999999)}",
                    unit=Product.Unit.PACK if "(" in name else Product.Unit.PIECE,
                    opening_stock=self.rng.randint(reorder * 3, reorder * 8),
                )
                product.popularity = self.rng.uniform(0.3, 3.0)
                products.append(product)
        opening = timezone.make_aware(datetime.combine(start - timedelta(days=1), time(9, 0)))
        StockMovement.objects.update(created_at=opening)
        Product.objects.update(created_at=opening)
        Category.objects.update(created_at=opening)
        return products

    def _customers(self) -> list[Customer]:
        return [
            Customer.objects.create(
                name=name,
                phone=f"+91 9{self.rng.randint(100000000, 999999999)}",
                email=f"{name.split()[0].lower()}@example.com" if self.rng.random() < 0.7 else "",
                address=self.rng.choice(["Kochi", "Thrissur", "Kozhikode", "Kannur", "Trivandrum"])
                + ", Kerala",
            )
            for name in CUSTOMERS
        ]

    def _history(self, products, customers, users, start, days):
        weights = [p.popularity for p in products]
        methods = (
            [Sale.PaymentMethod.UPI] * 5
            + [Sale.PaymentMethod.CASH] * 3
            + [Sale.PaymentMethod.CARD] * 2
            + [Sale.PaymentMethod.BANK_TRANSFER]
        )
        cashiers = users[1:] or users
        quiet_tail = 6  # no restocks in the final days so some alerts remain

        for offset in range(days + 1):
            day = start + timedelta(days=offset)
            growth = 1 + offset / max(days, 1) * 0.6
            weekend = 1.5 if day.weekday() >= 5 else 1.0
            orders = max(1, int(self.rng.gauss(8 * growth * weekend, 2)))

            if offset % 7 == 3 and offset < days - quiet_tail:
                self._restock(products, users[0], day)

            now = timezone.now()
            stamps = sorted(
                timezone.make_aware(
                    datetime.combine(
                        day, time(self.rng.randint(9, 20), self.rng.randint(0, 59), self.rng.randint(0, 59))
                    )
                )
                for _ in range(orders)
            )
            stamps = [
                s if s <= now else now - timedelta(minutes=len(stamps) - i) for i, s in enumerate(stamps)
            ]

            for stamp in stamps:
                in_stock = [(p, w) for p, w in zip(products, weights, strict=True) if p.quantity > 0]
                if not in_stock:
                    break
                picks = self.rng.choices(
                    [p for p, _ in in_stock], [w for _, w in in_stock], k=self.rng.choice([1, 1, 2, 2, 3, 4])
                )
                lines = {}
                for product in picks:
                    if product.pk not in lines and product.quantity > 0:
                        lines[product.pk] = {
                            "product": product,
                            "quantity": min(product.quantity, self.rng.choice([1, 1, 1, 2, 3])),
                        }
                subtotal = sum(line["product"].selling_price * line["quantity"] for line in lines.values())
                discount = Decimal(self.rng.choice([0, 0, 0, 0, 5, 10])) * subtotal / 100

                mark = self._last_notification_id()
                sale = sales.create_sale(
                    user=self.rng.choice(cashiers),
                    items=list(lines.values()),
                    customer=self.rng.choice(customers) if self.rng.random() < 0.65 else None,
                    payment_method=self.rng.choice(methods),
                    discount_amount=discount.quantize(Decimal("0.01")),
                )
                if self.rng.random() < 0.02:
                    sales.cancel_sale(sale=sale, user=users[0], reason="Customer returned items")
                self._backdate(sale, stamp)
                self._stamp_notifications_since(mark, stamp)
                for line in lines.values():
                    line["product"].refresh_from_db(fields=["quantity", "cost_price"])

            if offset % 15 == 0:
                self.stdout.write(f"  … {day:%d %b}: {Sale.objects.count()} sales so far")

    def _restock(self, products, user, day):
        stamp = timezone.make_aware(datetime.combine(day, time(8, 30)))
        mark = self._last_notification_id()
        for product in products:
            if product.quantity <= product.reorder_level * 1.5:
                qty = product.reorder_level * self.rng.randint(4, 7)
                cost = (product.cost_price * Decimal(self.rng.uniform(0.95, 1.05))).quantize(Decimal("0.01"))
                movement = inventory.stock_in(
                    product=product,
                    quantity=qty,
                    user=user,
                    unit_cost=cost,
                    reference=f"PO-{day:%y%m%d}",
                    note="Weekly replenishment",
                )
                StockMovement.objects.filter(pk=movement.pk).update(created_at=stamp)
                product.refresh_from_db(fields=["quantity", "cost_price"])
        self._stamp_notifications_since(mark, stamp)

    @staticmethod
    def _last_notification_id() -> int:
        return Notification.objects.order_by("-id").values_list("id", flat=True).first() or 0

    @staticmethod
    def _stamp_notifications_since(mark: int, stamp) -> None:
        """Give notifications created since `mark` the simulated historical timestamp."""
        Notification.objects.filter(id__gt=mark).update(created_at=stamp)

    def _backdate(self, sale, stamp):
        Sale.objects.filter(pk=sale.pk).update(created_at=stamp, updated_at=stamp)
        StockMovement.objects.filter(reference=sale.invoice_number).update(created_at=stamp)
        if sale.cancelled_at:
            Sale.objects.filter(pk=sale.pk).update(cancelled_at=stamp + timedelta(hours=2))

    def _tidy_notifications(self):
        """Keep the 12 newest notifications per user so the bell looks realistic."""
        for user in User.objects.all():
            keep = list(Notification.objects.filter(recipient=user).values_list("id", flat=True)[:12])
            Notification.objects.filter(recipient=user).exclude(id__in=keep).delete()
            Notification.objects.filter(id__in=keep[5:]).update(is_read=True, read_at=timezone.now())
