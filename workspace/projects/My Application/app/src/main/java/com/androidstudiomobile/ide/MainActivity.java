package com.androidstudiomobile.ide;

import android.os.Bundle;
import android.view.View;
import android.widget.Button;
import android.widget.TextView;
import android.widget.Toast;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {

    private int clickCount = 0;
    private TextView txtTitle;
    private TextView txtCounter;
    private Button btnAction;
    private Button btnReset;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        txtTitle = findViewById(R.id.txtTitle);
        txtCounter = findViewById(R.id.txtCounter);
        btnAction = findViewById(R.id.btnAction);
        btnReset = findViewById(R.id.btnReset);

        txtTitle.setText(R.string.app_name);
        txtCounter.setText("Taps: " + clickCount);

        btnAction.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clickCount++;
                txtCounter.setText("Taps: " + clickCount);
                Toast.makeText(MainActivity.this, "Button clicked: " + clickCount, Toast.LENGTH_SHORT).show();
            }
        });

        btnReset.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                clickCount = 0;
                txtCounter.setText("Taps: 0");
                Toast.makeText(MainActivity.this, "Counter reset", Toast.LENGTH_SHORT).show();
            }
        });
    }
}
