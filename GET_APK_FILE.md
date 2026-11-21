# GTA Dhaka — Android APK Download Guide (বাংলা / English)

> **কেন কোডের ভেতর সরাসরি `.apk` ফাইল তৈরি করে দেওয়া সম্ভব নয়?**  
> একটি আসল, ইনস্টলযোগ্য Android `.apk` ফাইল কম্পাইল ও ডিজিটালি সাইন করতে **Java JDK + Android SDK + Gradle (`aapt2`, `d8`, `apksigner`)** প্রয়োজন হয়। এই ওয়েব ডেভেলপমেন্ট এনভায়রনমেন্টে Android SDK/JDK নেই—আর ফেক বা আনকম্পাইল্ড `.apk` ফাইল দিলে Android ফোনে **"App not installed / Parse error"** দেখাবে।  
>
> তবে আপনার গেমটি ইতিমধ্যেই **১০০% ল্যান্ডস্কেপ ফুলস্ক্রিন + অফলাইন Android অ্যাপের জন্য তৈরি**। নিচের ৩টি আসল উপায়ের যেকোনো একটি ব্যবহার করে ২ মিনিটেই আসল Android অ্যাপ / `.apk` পেয়ে যাবেন:

---

## উপায় ১ (সবচেয়ে দ্রুত — ৫ সেকেন্ডে, কোনো পিসি ছাড়াই): Android Chrome 1-Tap Native Install
1. আপনার Android ফোনে **Chrome ব্রাউজারে** নিচের লিংকটি খুলুন:  
   `https://ais-pre-4gnxes77s74cc4xy5dwtmt-696590250321.asia-southeast1.run.app`
2. গেমের Start Screen-এ **"ফোনে অ্যাপ ইনস্টল করুন (অফলাইন)"** বাটনে ট্যাপ করুন (অথবা Chrome-এর উপরের `⋮` মেনু থেকে **Install app** চাপুন)।
3. Android Chrome স্বয়ংক্রিয়ভাবে একটি আসল **WebAPK** ইনস্টল করে হোম স্ক্রিনে আইকন বসিয়ে দেবে — যা ফুলস্ক্রিন ল্যান্ডস্কেপ ও অফলাইনে চলবে!

---

## উপায় ২ (২ মিনিটে আসল `.apk` ফাইল ডাউনলোড — পিসি ছাড়াই): PWABuilder
1. ফোনে বা ব্রাউজারে [https://www.pwabuilder.com](https://www.pwabuilder.com) ওপেন করুন।
2. URL বক্সে আপনার গেমের লিংক দিন:  
   `https://ais-pre-4gnxes77s74cc4xy5dwtmt-696590250321.asia-southeast1.run.app`
3. **Start → Package for Stores → Android → Generate Package** চাপুন।
4. যে `.zip` ফাইল ডাউনলোড হবে, তার ভেতরেই আসল সাইন করা **`.apk`** ফাইল পাবেন — সেটা ফোনে ক্লিক করে সরাসরি ইনস্টল করতে পারবেন!

---

## উপায় ৩ (অটোমেটিক 1-Click Offline Capacitor `.apk`): GitHub Actions
এই প্রজেক্টের ভেতর ইতিমধ্যেই `capacitor.config.json` এবং `.github/workflows/build-android-apk.yml` যুক্ত করে দেওয়া হয়েছে:
1. প্রজেক্টটি GitHub-এ আপলোড/পুশ করুন।
2. GitHub-এর **Actions** ট্যাবে গিয়ে **"Build GTA Dhaka Android APK"** রান করুন।
3. ২ মিনিট পর **Artifacts** সেকশন থেকে সরাসরি **`GTA-Dhaka-Landscape.apk`** ডাউনলোড করে ফোনে ইনস্টল করুন!
