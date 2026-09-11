package com.example.myapplication

import android.os.Bundle
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity

class TestActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_testactivity)

        val txtStatus = findViewById<TextView>(R.id.txtFeatureStatus)
        txtStatus.text = "Fitur aktif: test"
    }
}
