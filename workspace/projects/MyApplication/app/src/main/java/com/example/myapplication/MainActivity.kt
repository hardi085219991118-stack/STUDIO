package com.example.myapplication

import android.content.Intent
import android.os.Bundle
import android.widget.Button
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        findViewById<Button>(R.id.btnOpenDiscountCalculator).setOnClickListener {
            startActivity(Intent(this, BuatfiturkalkulatorActivity::class.java))
        }

        findViewById<Button>(R.id.btnOpenCashier).setOnClickListener {
            startActivity(Intent(this, CashierActivity::class.java))
        }

        findViewById<Button>(R.id.btnOpenCounter).setOnClickListener {
            startActivity(Intent(this, TambahkanfungsipenghitungActivity::class.java))
        }
    }
}
