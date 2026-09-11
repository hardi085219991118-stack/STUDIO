import { ProjectConfig, ProjectFile } from '../types';

export const INITIAL_PROJECT_CONFIG: ProjectConfig = {
  id: 'project-default',
  name: 'Android Studio Mobile',
  packageName: 'com.androidstudiomobile.ide',
  language: 'Kotlin',
  buildSystem: 'Gradle (Kotlin DSL)',
  minSdk: 24,
  targetSdk: 34,
  compileSdk: 34,
  versionName: '1.0.0',
  versionCode: 1,
  lastOpened: Date.now(),
};

export const PROJECT_TEMPLATES = [
  {
    id: 'empty_views',
    name: 'Empty Views Activity',
    description: 'Membuat Activity kosong standar dengan dukungan Layout XML dan ViewBinding.',
    icon: 'Smartphone',
    defaultLanguage: 'Kotlin' as const,
    minSdk: 24,
    targetSdk: 34,
    compileSdk: 34,
  },
  {
    id: 'compose_activity',
    name: 'Empty Activity (Compose)',
    description: 'UI Android modern dengan Jetpack Compose, Material 3, dan Coroutine Kotlin.',
    icon: 'LayoutGrid',
    defaultLanguage: 'Kotlin' as const,
    minSdk: 26,
    targetSdk: 34,
    compileSdk: 34,
  },
  {
    id: 'basic_activity',
    name: 'Basic Views Activity',
    description: 'Activity dengan AppBar, Floating Action Button, dan Komponen Navigasi.',
    icon: 'Layers',
    defaultLanguage: 'Kotlin' as const,
    minSdk: 24,
    targetSdk: 34,
    compileSdk: 34,
  },
  {
    id: 'login_activity',
    name: 'Login Activity',
    description: 'Alur autentikasi pengguna lengkap dengan validasi email/kata sandi dan ViewModel.',
    icon: 'Lock',
    defaultLanguage: 'Kotlin' as const,
    minSdk: 24,
    targetSdk: 34,
    compileSdk: 34,
  },
  {
    id: 'nav_drawer',
    name: 'Navigation Drawer Activity',
    description: 'Layout Drawer dengan item menu, tampilan header, dan navigasi fragment.',
    icon: 'Menu',
    defaultLanguage: 'Kotlin' as const,
    minSdk: 24,
    targetSdk: 34,
    compileSdk: 34,
  },
  {
    id: 'java_project',
    name: 'Java Legacy Project',
    description: 'Proyek Android Studio tradisional dibangun menggunakan Java 17 dan AppCompat.',
    icon: 'Coffee',
    defaultLanguage: 'Java' as const,
    minSdk: 21,
    targetSdk: 34,
    compileSdk: 34,
  },
];

export function generateProjectFiles(config: ProjectConfig, templateId: string): ProjectFile[] {
  const packagePath = config.packageName.replace(/\./g, '/');
  const isKotlin = config.language === 'Kotlin';
  const ext = isKotlin ? 'kt' : 'java';

  const manifestContent = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:tools="http://schemas.android.com/tools"
    package="${config.packageName}">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />

    <application
        android:allowBackup="true"
        android:dataExtractionRules="@xml/data_extraction_rules"
        android:fullBackupContent="@xml/backup_rules"
        android:icon="@mipmap/ic_launcher"
        android:label="${config.name}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.${config.name.replace(/\s+/g, '')}"
        tools:targetApi="34">
        
        <activity
            android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>`;

  const mainActivityKotlin = `package ${config.packageName}

import android.os.Bundle
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private var clickCount = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        val txtTitle = findViewById<TextView>(R.id.txtTitle)
        val txtCounter = findViewById<TextView>(R.id.txtCounter)
        val btnAction = findViewById<Button>(R.id.btnAction)
        val btnReset = findViewById<Button>(R.id.btnReset)

        txtTitle.text = getString(R.string.app_name)
        txtCounter.text = "Taps: $clickCount"

        btnAction.setOnClickListener {
            clickCount++
            txtCounter.text = "Taps: $clickCount"
            Toast.makeText(this, "Button Clicked! Count is $clickCount", Toast.LENGTH_SHORT).show()
        }

        btnReset.setOnClickListener {
            clickCount = 0
            txtCounter.text = "Taps: 0"
            Toast.makeText(this, "Counter Reset", Toast.LENGTH_SHORT).show()
        }
    }
}
`;

  const mainActivityJava = `package ${config.packageName};

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
`;

  const activityMainLayout = `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    xmlns:app="http://schemas.android.com/apk/res-auto"
    xmlns:tools="http://schemas.android.com/tools"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:gravity="center"
    android:padding="24dp"
    android:background="#121316"
    tools:context=".MainActivity">

    <ImageView
        android:id="@+id/imgLogo"
        android:layout_width="96dp"
        android:layout_height="96dp"
        android:layout_marginBottom="24dp"
        android:src="@mipmap/ic_launcher"
        android:contentDescription="App Logo" />

    <TextView
        android:id="@+id/txtTitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="${config.name}"
        android:textColor="#FFFFFF"
        android:textSize="24sp"
        android:textStyle="bold"
        android:layout_marginBottom="8dp" />

    <TextView
        android:id="@+id/txtSubtitle"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Built directly on Android Studio Mobile IDE"
        android:textColor="#9E9E9E"
        android:textSize="14sp"
        android:layout_marginBottom="32dp" />

    <TextView
        android:id="@+id/txtCounter"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:text="Taps: 0"
        android:textColor="#3DDC84"
        android:textSize="32sp"
        android:textStyle="bold"
        android:layout_marginBottom="32dp" />

    <Button
        android:id="@+id/btnAction"
        android:layout_width="220dp"
        android:layout_height="52dp"
        android:text="Click Me"
        android:textColor="#FFFFFF"
        android:backgroundTint="#3DDC84"
        android:layout_marginBottom="16dp" />

    <Button
        android:id="@+id/btnReset"
        android:layout_width="220dp"
        android:layout_height="48dp"
        android:text="Reset Counter"
        android:textColor="#BCBEC4"
        android:backgroundTint="#2B2D30" />

</LinearLayout>`;

  const stringsXml = `<resources>
    <string name="app_name">${config.name}</string>
    <string name="action_settings">Settings</string>
    <string name="welcome_message">Welcome to ${config.name}!</string>
</resources>`;

  const colorsXml = `<resources>
    <color name="primary">#3DDC84</color>
    <color name="primary_dark">#07C160</color>
    <color name="accent">#4285F4</color>
    <color name="background_dark">#121316</color>
    <color name="surface_dark">#1E1F22</color>
    <color name="text_primary">#FFFFFF</color>
    <color name="text_secondary">#9E9E9E</color>
</resources>`;

  const themesXml = `<resources>
    <style name="Theme.${config.name.replace(/\s+/g, '')}" parent="Theme.Material3.DayNight.NoActionBar">
        <item name="colorPrimary">@color/primary</item>
        <item name="colorAccent">@color/accent</item>
        <item name="android:statusBarColor">@color/background_dark</item>
        <item name="android:navigationBarColor">@color/background_dark</item>
    </style>
</resources>`;

  const buildGradleAppKts = `plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "${config.packageName}"
    compileSdk = ${config.compileSdk}

    defaultConfig {
        applicationId = "${config.packageName}"
        minSdk = ${config.minSdk}
        targetSdk = ${config.targetSdk}
        versionCode = ${config.versionCode}
        versionName = "${config.versionName}"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("com.google.android.material:material:1.12.0")
    implementation("androidx.constraintlayout:constraintlayout:2.1.4")
    testImplementation("junit:junit:4.13.2")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
}
`;

  const settingsGradleKts = `pluginManagement {
    repositories {
        google {
            content {
                includeGroupByRegex("com\\\\.android.*")
                includeGroupByRegex("com\\\\.google.*")
                includeGroupByRegex("androidx.*")
            }
        }
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "${config.name}"
include(":app")
`;

  const rootBuildGradleKts = `// Top-level build file where you can add configuration options common to all sub-projects/modules.
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
`;

  const gradleWrapperProperties = `distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\\://services.gradle.org/distributions/gradle-8.7-bin.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
`;

  const libsVersionsToml = `[versions]
agp = "8.4.0"
kotlin = "1.9.23"
coreKtx = "1.13.1"
junit = "4.13.2"
junitVersion = "1.2.1"
espressoCore = "3.6.1"
appcompat = "1.7.0"
material = "1.12.0"
activity = "1.9.0"
constraintlayout = "2.1.4"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-appcompat = { group = "androidx.appcompat", name = "appcompat", version.ref = "appcompat" }
material = { group = "com.google.android.material", name = "material", version.ref = "material" }
androidx-activity = { group = "androidx.activity", name = "activity", version.ref = "activity" }
androidx-constraintlayout = { group = "androidx.constraintlayout", name = "constraintlayout", version.ref = "constraintlayout" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
`;

  const dataExtractionRulesXml = `<?xml version="1.0" encoding="utf-8"?>
<data-extraction-rules>
    <cloud-backup>
        <include domain="root" path="." />
    </cloud-backup>
    <device-transfer>
        <include domain="root" path="." />
    </device-transfer>
</data-extraction-rules>`;

  const backupRulesXml = `<?xml version="1.0" encoding="utf-8"?>
<full-backup-content>
    <include domain="sharedpref" path="." />
</full-backup-content>`;

  const icLauncherBackgroundXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#3DDC84"
        android:pathData="M0,0h108v108h-108z" />
</vector>`;

  const icLauncherForegroundXml = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="108"
    android:viewportHeight="108">
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M31,64.5c0,1.9 1.6,3.5 3.5,3.5h39c1.9,0 3.5,-1.6 3.5,-3.5v-23.5h-46v23.5z" />
    <path
        android:fillColor="#FFFFFF"
        android:pathData="M54,26c-9.4,0 -17.2,6.3 -19.5,15h39c-2.3,-8.7 -10.1,-15 -19.5,-15z" />
</vector>`;

  const icLauncherXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background" />
    <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`;

  const proguardRulesPro = `# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in defaultProguardFile("proguard-android-optimize.txt")
-keep public class * extends android.app.Activity
`;

  const gradlewBash = `#!/bin/sh
# Gradle start up script for POSIX
DIRNAME=\`dirname "$0"\`
GRADLE_WRAPPER_JAR="$DIRNAME/gradle/wrapper/gradle-wrapper.jar"

if [ -n "$JAVA_HOME" ] ; then
    JAVACMD="$JAVA_HOME/bin/java"
else
    JAVACMD="java"
fi

if ! command -v "$JAVACMD" >/dev/null 2>&1 ; then
    echo "ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH." >&2
    exit 1
fi

if [ ! -f "$GRADLE_WRAPPER_JAR" ] ; then
    # Fallback to system gradle if jar not bundled
    if command -v gradle >/dev/null 2>&1 ; then
        exec gradle "$@"
    else
        echo "ERROR: Gradle wrapper JAR not found at $GRADLE_WRAPPER_JAR and system gradle is missing." >&2
        exit 1
    fi
fi

exec "$JAVACMD" -jar "$GRADLE_WRAPPER_JAR" "$@"
`;

  const gradlewBat = `@rem Gradle startup script for Windows
@if "%DEBUG%" == "" @echo off
set DIRNAME=%~dp0
if defined JAVA_HOME goto findJavaFromJavaHome
set JAVACMD=java.exe
goto checkJava
:findJavaFromJavaHome
set JAVACMD=%JAVA_HOME%\\bin\\java.exe
:checkJava
"%JAVACMD%" -version >nul 2>&1
if "%ERRORLEVEL%" == "0" goto runWrapper
echo ERROR: JAVA_HOME is not set and no 'java' command could be found in your PATH.
exit /b 1
:runWrapper
if exist "%DIRNAME%gradle\\wrapper\\gradle-wrapper.jar" (
    "%JAVACMD%" -jar "%DIRNAME%gradle\\wrapper\\gradle-wrapper.jar" %*
) else (
    gradle %*
)
`;

  const codeContent = isKotlin ? mainActivityKotlin : mainActivityJava;

  return [
    // App Manifests
    {
      id: 'f-manifest',
      name: 'AndroidManifest.xml',
      path: 'app/src/main/AndroidManifest.xml',
      content: manifestContent,
      type: 'xml',
      isFolder: false,
    },
    // Source Code
    {
      id: 'f-mainactivity',
      name: `MainActivity.${ext}`,
      path: `app/src/main/java/${packagePath}/MainActivity.${ext}`,
      content: codeContent,
      type: isKotlin ? 'kotlin' : 'java',
      isFolder: false,
    },
    // Layout
    {
      id: 'f-layout-main',
      name: 'activity_main.xml',
      path: 'app/src/main/res/layout/activity_main.xml',
      content: activityMainLayout,
      type: 'xml',
      isFolder: false,
    },
    // Values
    {
      id: 'f-strings',
      name: 'strings.xml',
      path: 'app/src/main/res/values/strings.xml',
      content: stringsXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-colors',
      name: 'colors.xml',
      path: 'app/src/main/res/values/colors.xml',
      content: colorsXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-themes',
      name: 'themes.xml',
      path: 'app/src/main/res/values/themes.xml',
      content: themesXml,
      type: 'xml',
      isFolder: false,
    },
    // Manifest-Referenced XML Rules
    {
      id: 'f-data-extraction',
      name: 'data_extraction_rules.xml',
      path: 'app/src/main/res/xml/data_extraction_rules.xml',
      content: dataExtractionRulesXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-backup-rules',
      name: 'backup_rules.xml',
      path: 'app/src/main/res/xml/backup_rules.xml',
      content: backupRulesXml,
      type: 'xml',
      isFolder: false,
    },
    // Launcher Icons & Drawables
    {
      id: 'f-ic-bg',
      name: 'ic_launcher_background.xml',
      path: 'app/src/main/res/drawable/ic_launcher_background.xml',
      content: icLauncherBackgroundXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-ic-fg',
      name: 'ic_launcher_foreground.xml',
      path: 'app/src/main/res/drawable/ic_launcher_foreground.xml',
      content: icLauncherForegroundXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-ic-launcher',
      name: 'ic_launcher.xml',
      path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',
      content: icLauncherXml,
      type: 'xml',
      isFolder: false,
    },
    {
      id: 'f-ic-launcher-round',
      name: 'ic_launcher_round.xml',
      path: 'app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml',
      content: icLauncherXml,
      type: 'xml',
      isFolder: false,
    },
    // Proguard Rules
    {
      id: 'f-proguard',
      name: 'proguard-rules.pro',
      path: 'app/proguard-rules.pro',
      content: proguardRulesPro,
      type: 'text',
      isFolder: false,
    },
    // Gradle Scripts
    {
      id: 'f-build-gradle-app',
      name: 'build.gradle.kts (Module :app)',
      path: 'app/build.gradle.kts',
      content: buildGradleAppKts,
      type: 'gradle',
      isFolder: false,
    },
    {
      id: 'f-build-gradle-root',
      name: 'build.gradle.kts (Project)',
      path: 'build.gradle.kts',
      content: rootBuildGradleKts,
      type: 'gradle',
      isFolder: false,
    },
    {
      id: 'f-settings-gradle',
      name: 'settings.gradle.kts',
      path: 'settings.gradle.kts',
      content: settingsGradleKts,
      type: 'gradle',
      isFolder: false,
    },
    {
      id: 'f-gradle-wrapper',
      name: 'gradle-wrapper.properties',
      path: 'gradle/wrapper/gradle-wrapper.properties',
      content: gradleWrapperProperties,
      type: 'text',
      isFolder: false,
    },
    {
      id: 'f-gradlew',
      name: 'gradlew',
      path: 'gradlew',
      content: gradlewBash,
      type: 'text',
      isFolder: false,
    },
    {
      id: 'f-gradlew-bat',
      name: 'gradlew.bat',
      path: 'gradlew.bat',
      content: gradlewBat,
      type: 'text',
      isFolder: false,
    },
    {
      id: 'f-libs-versions-toml',
      name: 'libs.versions.toml',
      path: 'gradle/libs.versions.toml',
      content: libsVersionsToml,
      type: 'other',
      isFolder: false,
    },
  ];
}
