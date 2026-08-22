"""
KesslerX Firebase Configuration
Initializes Firebase Admin SDK for Firestore persistence.
Falls back to in-memory storage if Firebase is not configured.

To enable Firebase:
1. Create a Firebase project at https://console.firebase.google.com
2. Generate a service account key (Project Settings > Service Accounts > Generate New Private Key)
3. Set FIREBASE_SERVICE_ACCOUNT_PATH in .env to the path of the JSON key file
   OR set GOOGLE_APPLICATION_CREDENTIALS environment variable
"""

import os
import json
import logging

logger = logging.getLogger(__name__)

_firebase_app = None
_firestore_client = None
_firebase_available = False


def init_firebase():
    """Initialize Firebase Admin SDK. Safe to call multiple times."""
    global _firebase_app, _firestore_client, _firebase_available

    if _firebase_app is not None:
        return _firebase_available

    try:
        import firebase_admin
        from firebase_admin import credentials, firestore

        cred_json = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
        cred_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
        project_id = os.getenv("FIREBASE_PROJECT_ID", "keerx-25b72")
        
        if cred_json:
            # Load credentials directly from JSON string (ideal for Render/cloud env vars)
            cred_dict = json.loads(cred_json)
            cred = credentials.Certificate(cred_dict)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info("Firebase initialized from FIREBASE_SERVICE_ACCOUNT_JSON env var")
        elif cred_path and os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            _firebase_app = firebase_admin.initialize_app(cred)
            logger.info(f"Firebase initialized with service account: {cred_path}")
        elif os.getenv("GOOGLE_APPLICATION_CREDENTIALS"):
            _firebase_app = firebase_admin.initialize_app()
            logger.info("Firebase initialized with GOOGLE_APPLICATION_CREDENTIALS")
        elif project_id:
            # Use Application Default Credentials with project ID
            _firebase_app = firebase_admin.initialize_app(options={
                'projectId': project_id,
            })
            logger.info(f"Firebase initialized with project ID: {project_id}")
        else:
            logger.warning(
                "No Firebase credentials found. Using in-memory storage. "
                "Set FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH, "
                "or FIREBASE_PROJECT_ID to enable persistence."
            )
            _firebase_available = False
            _firebase_app = "disabled"  # Mark as attempted
            return False

        _firestore_client = firestore.client()
        # Verify database exists and is reachable
        try:
            # Perform a lightweight read to verify the database is provisioned
            _ = _firestore_client.collection("users").limit(1).get()
            _firebase_available = True
            logger.info("Firestore client initialized and connected successfully")
            return True
        except Exception as db_err:
            logger.warning(
                f"Firestore database (default) not provisioned or unreachable: {db_err}. "
                "Please create Firestore Database in Firebase Console (Build > Firestore Database > Create Database). "
                "Falling back to in-memory storage."
            )
            _firebase_available = False
            _firestore_client = None
            return False

    except Exception as e:
        logger.warning(f"Firebase initialization failed: {e}. Using in-memory storage.")
        _firebase_available = False
        _firebase_app = "disabled"
        return False


def get_firestore():
    """Get Firestore client. Returns None if Firebase is not available."""
    if not _firebase_available:
        return None
    return _firestore_client


def is_firebase_available():
    """Check if Firebase is configured and available."""
    return _firebase_available
