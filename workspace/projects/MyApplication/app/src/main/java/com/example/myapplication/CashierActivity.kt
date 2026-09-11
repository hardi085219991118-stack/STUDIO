package com.example.myapplication

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.NumberFormat
import java.util.Locale
import com.example.myapplication.model.Product
import com.example.myapplication.model.CartItem

class CashierActivity : AppCompatActivity() {

    private val catalog = listOf(
        Product("1", "Kopi Robusta", 15000.0, "Minuman", 50),
        Product("2", "Kopi Susu Gula Aren", 20000.0, "Minuman", 40),
        Product("3", "Roti Bakar Cokelat", 18000.0, "Makanan", 30),
        Product("4", "Kentang Goreng", 16000.0, "Snack", 25)
    )

    private val cart = mutableListOf<CartItem>()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_cashier)

        val txtTotal = findViewById<TextView>(R.id.txtTotalAmount)
        val btnAdd1 = findViewById<Button>(R.id.btnAddKopi)
        val btnAdd2 = findViewById<Button>(R.id.btnAddRoti)
        val btnCheckout = findViewById<Button>(R.id.btnCheckout)
        val btnClear = findViewById<Button>(R.id.btnClearCart)

        val formatter = NumberFormat.getCurrencyInstance(Locale("id", "ID"))

        fun updateUI() {
            val total = cart.sumOf { it.subtotal }
            txtTotal.text = formatter.format(total)
        }

        btnAdd1.setOnClickListener {
            addToCart(catalog[0])
            updateUI()
            Toast.makeText(this, "${catalog[0].name} ditambahkan", Toast.LENGTH_SHORT).show()
        }

        btnAdd2.setOnClickListener {
            addToCart(catalog[2])
            updateUI()
            Toast.makeText(this, "${catalog[2].name} ditambahkan", Toast.LENGTH_SHORT).show()
        }

        btnClear.setOnClickListener {
            cart.clear()
            updateUI()
            Toast.makeText(this, "Keranjang dibersihkan", Toast.LENGTH_SHORT).show()
        }

        btnCheckout.setOnClickListener {
            if (cart.isEmpty()) {
                Toast.makeText(this, "Keranjang belanja kosong!", Toast.LENGTH_SHORT).show()
            } else {
                val total = cart.sumOf { it.subtotal }
                Toast.makeText(this, "Transaksi Berhasil! Total: ${formatter.format(total)}", Toast.LENGTH_LONG).show()
                cart.clear()
                updateUI()
            }
        }

        updateUI()
    }

    private fun addToCart(product: Product) {
        val existing = cart.find { it.product.id == product.id }
        if (existing != null) {
            existing.quantity++
        } else {
            cart.add(CartItem(product, 1))
        }
    }
}
