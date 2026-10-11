import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

const GOOGLE_WEB_CLIENT_ID =
  '586932371847-8kr8epdn0u64jdma6e6s8is1hdodv5pt.apps.googleusercontent.com';

let isConfigured = false;

export function configureGoogleSignIn(): void {
  if (!isConfigured) {
    GoogleSignin.configure({
      webClientId: GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
    isConfigured = true;
  }
}

export class GoogleSignInService {
  /**
   * Prompts the native Google Sign-In sheet, returns the verified Google ID Token
   */
  static async promptGoogleSignIn(): Promise<string> {
    configureGoogleSignIn();

    await GoogleSignin.hasPlayServices({
      showPlayServicesUpdateDialog: true,
    });

    const response = await GoogleSignin.signIn();

    let idToken: string | null | undefined;

    if (response && response.type === 'success') {
      idToken = response.data?.idToken;
    } else if (response && (response as any).data?.idToken) {
      idToken = (response as any).data.idToken;
    } else if (response && (response as any).idToken) {
      idToken = (response as any).idToken;
    }

    if (!idToken) {
      throw new Error(
        'Could not obtain Google authentication token. Please try again.',
      );
    }

    return idToken;
  }

  static async signOut(): Promise<void> {
    try {
      configureGoogleSignIn();
      await GoogleSignin.signOut();
    } catch {
      // Gracefully ignore sign-out errors
    }
  }
}

export { statusCodes };
