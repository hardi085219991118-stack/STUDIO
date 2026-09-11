package com.example.myapplication.model

data class Product(
    val id: String,
    val name: String,
    val price: Double,
    val category: String,
    var stock: Int = 100
)

data class CartItem(
    val product: Product,
    var quantity: Int
) {
    val subtotal: Double
        get() = product.price * quantity
}
