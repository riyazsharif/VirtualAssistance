# Backend Server Start करने के लिए

## Step 1: Terminal खोलें
VS Code में नया terminal खोलें (Ctrl + `) या Command Prompt/PowerShell खोलें

## Step 2: Backend folder में जाएं
```bash
cd D:\VirtualAssistance\backend
```

## Step 3: Server Start करें
```bash
npm run dev
```

## Expected Output:
आपको terminal में ये messages दिखने चाहिए:
```
🚀 Server is running on http://localhost:8000
📡 Health check: http://localhost:8000/
server started!!
✅ db connected!  (अगर MongoDB configured है)
```

## अगर Error आ रहा है:

### Error 1: "MONGODB_URL is not defined"
**Solution:** `.env` file में `MONGODB_URL` add करें:
```
MONGODB_URL=mongodb://localhost:27017/virtualassistance
```

### Error 2: "Cannot find module"
**Solution:** Dependencies install करें:
```bash
npm install
```

### Error 3: "Port 8000 already in use"
**Solution:** 
- Port 8000 use करने वाला process close करें
- या `.env` file में `PORT=8001` set करें

## Test करने के लिए:
Browser में ये URL open करें:
```
http://localhost:8000/
```

आपको ये message दिखना चाहिए:
```json
{"message":"Backend server is running!","status":"ok"}
```

## Important:
Server start होने के बाद **इस terminal को open रखें**। Server को stop करने के लिए `Ctrl + C` दबाएं।

