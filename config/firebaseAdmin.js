const {
    cert,
    getApp,
    getApps,
    initializeApp
} = require('firebase-admin/app')

const {
    getMessaging
} = require('firebase-admin/messaging')


function getFirebaseConfig() {
    const projectId =
        process.env.FIREBASE_PROJECT_ID

    const clientEmail =
        process.env.FIREBASE_CLIENT_EMAIL

    const privateKey =
        process.env.FIREBASE_PRIVATE_KEY
            ?.replace(/\\n/g, '\n')


    if (
        !projectId ||
        !clientEmail ||
        !privateKey
    ) {
        return null
    }


    return {
        projectId,
        clientEmail,
        privateKey
    }
}


function getFirebaseApp() {
    if (getApps().length > 0) {
        return getApp()
    }


    const firebaseConfig =
        getFirebaseConfig()


    if (!firebaseConfig) {
        console.warn(
            'Firebase Admin chưa được cấu hình đầy đủ.'
        )

        return null
    }


    return initializeApp({
        credential: cert(firebaseConfig)
    })
}


function getFirebaseMessaging() {
    const firebaseApp =
        getFirebaseApp()


    if (!firebaseApp) {
        return null
    }


    return getMessaging(firebaseApp)
}


module.exports = {
    getFirebaseMessaging
}