package com.example.myapplication

import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import java.text.NumberFormat
import java.util.Locale

class BuatfiturkalkulatorActivity : AppCompatActivity() {

    private lateinit var etOriginalPrice: EditText
    private lateinit var etDiscountPercent: EditText
    private lateinit var btnCalculate: Button
    private lateinit var btnReset: Button
    private lateinit var cardResult: View
    private lateinit var txtOriginalPriceResult: TextView
    private lateinit var txtDiscountAmount: TextView
    private lateinit var txtFinalPrice: TextView
    private lateinit var txtFeatureStatus: TextView

    private val rupiahFormat = NumberFormat.getCurrencyInstance(Locale("in", "ID")).apply {
        maximumFractionDigits = 0
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_buatfiturkalkulatoractivity)

        initViews()
        setupQuickPercentButtons()
        setupActionButtons()
    }

    private fun initViews() {
        etOriginalPrice = findViewById(R.id.etOriginalPrice)
        etDiscountPercent = findViewById(R.id.etDiscountPercent)
        btnCalculate = findViewById(R.id.btnCalculate)
        btnReset = findViewById(R.id.btnReset)
        cardResult = findViewById(R.id.cardResult)
        txtOriginalPriceResult = findViewById(R.id.txtOriginalPriceResult)
        txtDiscountAmount = findViewById(R.id.txtDiscountAmount)
        txtFinalPrice = findViewById(R.id.txtFinalPrice)
        txtFeatureStatus = findViewById(R.id.txtFeatureStatus)

        txtFeatureStatus.text = "Masukkan harga awal dan diskon untuk menghitung potongan harga."
    }

    private fun setupQuickPercentButtons() {
        findViewById<Button>(R.id.btnQuick10).setOnClickListener { setDiscountQuick(10.0) }
        findViewById<Button>(R.id.btnQuick20).setOnClickListener { setDiscountQuick(20.0) }
        findViewById<Button>(R.id.btnQuick30).setOnClickListener { setDiscountQuick(30.0) }
        findViewById<Button>(R.id.btnQuick50).setOnClickListener { setDiscountQuick(50.0) }
        findViewById<Button>(R.id.btnQuick70).setOnClickListener { setDiscountQuick(70.0) }
    }

    private fun setDiscountQuick(percent: Double) {
        etDiscountPercent.setText(percent.toInt().toString())
        if (etOriginalPrice.text.toString().isNotBlank()) {
            calculateDiscount()
        }
    }

    private fun setupActionButtons() {
        btnCalculate.setOnClickListener {
            calculateDiscount()
        }

        btnReset.setOnClickListener {
            etOriginalPrice.text.clear()
            etDiscountPercent.text.clear()
            cardResult.visibility = View.GONE
            txtFeatureStatus.text = "Data telah direset. Silakan masukkan harga baru."
            etOriginalPrice.requestFocus()
        }
    }

    private fun calculateDiscount() {
        val originalPriceStr = etOriginalPrice.text.toString().trim()
        val discountPercentStr = etDiscountPercent.text.toString().trim()

        if (originalPriceStr.isEmpty()) {
            etOriginalPrice.error = "Masukkan harga asli"
            etOriginalPrice.requestFocus()
            return
        }

        if (discountPercentStr.isEmpty()) {
            etDiscountPercent.error = "Masukkan persentase diskon"
            etDiscountPercent.requestFocus()
            return
        }

        val originalPrice = originalPriceStr.toDoubleOrNull()
        val discountPercent = discountPercentStr.toDoubleOrNull()

        if (originalPrice == null || originalPrice < 0) {
            Toast.makeText(this, "Harga asli tidak valid", Toast.LENGTH_SHORT).show()
            return
        }

        if (discountPercent == null || discountPercent < 0 || discountPercent > 100) {
            Toast.makeText(this, "Diskon harus di antara 0% sampai 100%", Toast.LENGTH_SHORT).show()
            return
        }

        val discountAmount = originalPrice * (discountPercent / 100.0)
        val finalPrice = originalPrice - discountAmount

        txtOriginalPriceResult.text = rupiahFormat.format(originalPrice)
        txtDiscountAmount.text = "- ${rupiahFormat.format(discountAmount)} (${discountPercent.toInt()}%)"
        txtFinalPrice.text = rupiahFormat.format(finalPrice)

        cardResult.visibility = View.VISIBLE
        txtFeatureStatus.text = "Anda hemat sebesar ${rupiahFormat.format(discountAmount)}!"
    }
}
