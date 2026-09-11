/**
 * AndroidManifest Utility
 * Extracts package name, launcher activities, and component metadata
 * directly from genuine XML source.
 */

export function findLauncherActivity(manifestXml: string): string | null {
  if (!manifestXml) return null;

  try {
    // 1. Match <activity ...> ... </activity> blocks
    const activityBlockRegex = /<activity\b([^>]*?)>([\s\S]*?)<\/activity>/gi;
    let match: RegExpExecArray | null;

    while ((match = activityBlockRegex.exec(manifestXml)) !== null) {
      const activityAttrs = match[1];
      const activityBody = match[2];

      const hasMainAction = activityBody.includes('android.intent.action.MAIN') ||
        activityBody.includes('"android.intent.action.MAIN"') ||
        activityBody.includes("'android.intent.action.MAIN'");

      const hasLauncherCategory = activityBody.includes('android.intent.category.LAUNCHER') ||
        activityBody.includes('"android.intent.category.LAUNCHER"') ||
        activityBody.includes("'android.intent.category.LAUNCHER'");

      if (hasMainAction && hasLauncherCategory) {
        const nameMatch = activityAttrs.match(/android:name=["']([^"']+)["']/);
        if (nameMatch) {
          return nameMatch[1];
        }
      }
    }

    // 2. Fallback: Search in single-tag or irregular formatting
    const genericMatch = manifestXml.match(/<activity\b[^>]*android:name=["']([^"']+)["'][^>]*>[\s\S]*?android\.intent\.action\.MAIN[\s\S]*?android\.intent\.category\.LAUNCHER[\s\S]*?<\/activity>/i);
    if (genericMatch) {
      return genericMatch[1];
    }

    // 3. Fallback: First activity declared in manifest
    const firstActivityMatch = manifestXml.match(/<activity\b[^>]*android:name=["']([^"']+)["']/i);
    if (firstActivityMatch) {
      return firstActivityMatch[1];
    }
  } catch (err) {
    console.warn('Failed to parse launcher activity from manifest XML:', err);
  }

  return null;
}

export function extractManifestPackageName(manifestXml: string): string | null {
  if (!manifestXml) return null;
  const match = manifestXml.match(/package=["']([^"']+)["']/i);
  return match ? match[1] : null;
}
