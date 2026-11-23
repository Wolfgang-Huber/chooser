# Put Chooser on the App Store

The website stays at https://wolfgang-huber.github.io/chooser/. The iPhone app is the same game, built in the cloud. You do not need a Mac.

The app on the phone is named Chooser. Its official id is `com.wolfganghuber.chooser`. The version is 1.0.0. Each build gets its own build number automatically.

You need your paid Apple Developer account, and you need to be able to change settings on this GitHub repository.

## 1. Find your Team ID

1. Open [Apple Developer account](https://developer.apple.com/account) and sign in.
2. Open **Membership details**.
3. Copy the **Team ID**. It is 10 letters and numbers.

## 2. Create the app at Apple

1. Open [App Store Connect](https://appstoreconnect.apple.com) and sign in.
2. Go to **Apps**, then the **+** button, then **New App**.
3. Choose **iOS**.
4. Name: start with **Chooser**. If Apple says that name is taken, use **Finger Chooser**.
5. Language: English.
6. Bundle ID: `com.wolfganghuber.chooser`. If it is not in the list, register it first:
   - Open [Identifiers](https://developer.apple.com/account/resources/identifiers/list).
   - Click **+**, choose **App IDs**, then **App**.
   - Description: Chooser.
   - Bundle ID: Explicit, `com.wolfganghuber.chooser`.
   - Register it, then go back and create the app.
7. SKU: `chooser`.
8. User access: full access. Create the app.

## 3. Create an API key

This key lets GitHub sign the app and send it to TestFlight. You can only download the key file once.

1. In App Store Connect, open **Users and Access**.
2. Open **Integrations**, then **App Store Connect API**.
3. If this is the first key, click **Request Access** and accept.
4. Click **+** to add a key.
5. Name: `Chooser GitHub`.
6. Access: **App Manager**.
7. Download the file. It ends in `.p8`. Keep it private.
8. On that same page, copy the **Issuer ID** and the key's **Key ID**.

If a later build fails because Apple will not create the signing certificate, make a new key with access **Admin** and replace the secret in step 4. App Manager is the right choice to start with. Admin is only needed if Apple blocks signing.

## 4. Add four secrets on GitHub

1. Open the Chooser repository on GitHub.
2. Go to **Settings**, then **Secrets and variables**, then **Actions**.
3. Add these repository secrets. Paste the values with no extra quotes.

| Secret name | What to paste |
| --- | --- |
| `APPSTORE_ISSUER_ID` | The Issuer ID from the API keys page |
| `APPSTORE_KEY_ID` | The Key ID of the key you just made |
| `APPSTORE_PRIVATE_KEY` | The whole `.p8` file, including the BEGIN and END lines |
| `APPLE_TEAM_ID` | The Team ID from step 1 |

## 5. Start a build

1. Open the **Actions** tab in the repository.
2. Choose **iOS TestFlight** on the left.
3. Click **Run workflow**, leave the branch as `main`, and run it.

You can also start a build by pushing a tag such as `v1.0.0`. You do not need to do both.

The build takes a while. When it finishes, the green check means the app was sent to TestFlight. Apple then spends some more time processing it. You will get an email.

The app does not use special encryption, so Apple should not ask an extra export question. If it does, answer that the app only uses standard protection, nothing custom.

## 6. Try it in TestFlight

1. Install Apple's **TestFlight** app on your iPhone.
2. Open the email, or open App Store Connect, then your app, then **TestFlight**.
3. Install Chooser and put at least two fingers on the screen.
4. One finger should be picked. The phone should buzz, and you should hear a short sound unless the phone is on silent.

## 7. Send it to Apple for review

In App Store Connect, open the app, then the **App Store** tab, and fill in the first version.

A privacy policy address is required. Use:

https://wolfgang-huber.github.io/chooser/privacy.html

If Apple asks for a support website, you can use:

https://wolfgang-huber.github.io/chooser/

You also need iPhone screenshots. Take them on your phone from the TestFlight build. A 6.7-inch iPhone screenshot size is the one Apple usually asks for first.

Privacy answers: choose **Data Not Collected**. The app does not track anyone.

When the page is complete, add the TestFlight build to the version and submit it for review.

## Store text you can paste

Use **Chooser** as the store name if Apple allows it. If not, use **Finger Chooser**. Other names that fit: **Pick a Finger**, **Chooser Party**.

The name under the icon on the phone stays **Chooser**.

**Subtitle**

```
One finger gets picked
```

**Description**

```
Put everyone's fingers on the screen. Chooser waits a moment, then picks one.

Each finger gets its own bright color. When the choice is made, that color fills the screen, the phone gives a little buzz, and a short sound plays.

Use it at dinner, at a party, or whenever a group needs one person to go first.

No accounts. No scores. Nothing is saved.
```

**Keywords**

```
finger,party,picker,random,game,choice,group,touch,decision,friends
```

**Privacy**

Answer that you do not collect data. The privacy policy is https://wolfgang-huber.github.io/chooser/privacy.html.
