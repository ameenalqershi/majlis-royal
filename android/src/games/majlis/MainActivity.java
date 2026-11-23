package games.majlis;

import android.app.Activity;
import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import org.json.*;

public class MainActivity extends Activity {
    private WebView engine, screen;
    private ServerSocket listener;
    private final ThreadPoolExecutor workers = new ThreadPoolExecutor(4, 12, 30, TimeUnit.SECONDS, new ArrayBlockingQueue<>(40));
    private static final int PORT = 8787;

    @Override public void onCreate(Bundle saved) {
        super.onCreate(saved);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xff102923);
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        engine = new WebView(this);
        screen = new WebView(this);
        layout.addView(engine,1,1);
        layout.addView(screen,-1,-1);
        setContentView(layout);
        layout.setOnApplyWindowInsetsListener((view,insets)->{
            view.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        engine.getSettings().setJavaScriptEnabled(true);
        screen.getSettings().setJavaScriptEnabled(true);
        screen.getSettings().setDomStorageEnabled(true);
        screen.getSettings().setAllowFileAccess(false);
        screen.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView w, WebResourceRequest r){
                return !"127.0.0.1".equals(r.getUrl().getHost()) || r.getUrl().getPort()!=PORT;
            }
        });
        engine.setWebViewClient(new WebViewClient(){
            @Override public void onPageFinished(WebView w,String url){
                new Thread(() -> listen()).start();
            }
        });
        engine.loadUrl("file:///android_asset/host.html");
    }
    private void listen(){
        try(ServerSocket socket=new ServerSocket()){
            listener=socket;
            socket.setReuseAddress(true);
            socket.bind(new InetSocketAddress(PORT));
            runOnUiThread(()->screen.loadUrl("http://127.0.0.1:"+PORT));
            while(!socket.isClosed()){
                Socket client=socket.accept();
                try{workers.execute(()->handle(client));}catch(RejectedExecutionException e){client.close();}
            }
        }catch(IOException e){
            if(!isFinishing() && !isDestroyed())runOnUiThread(()->Toast.makeText(this,"تعذّر فتح منفذ الطاولة 8787",Toast.LENGTH_LONG).show());
        }
    }
    private String line(InputStream in)throws IOException {
        ByteArrayOutputStream b=new ByteArrayOutputStream();
        for(int i=0;i<4096;i++){
            int v=in.read();
            if(v<0)throw new EOFException();
            if(v==10)return b.toString("US-ASCII").trim();
            b.write(v);
        }
        throw new IOException();
    }
    private void handle(Socket client){
        try(Socket socket=client){
            socket.setSoTimeout(5000);
            BufferedInputStream in=new BufferedInputStream(socket.getInputStream());
            String[] first=line(in).split(" ");
            if(first.length<2)return;
            String path=first[1].split("\\?",2)[0];
            int length=0;
            boolean json=false;
            for(int n=0;;n++){
                String h=line(in);
                if(h.isEmpty())break;
                if(n>48)return;
                String lower=h.toLowerCase(Locale.ROOT);
                if(lower.startsWith("content-length:"))length=Integer.parseInt(h.substring(15).trim());
                if(lower.equals("content-type: application/json"))json=true;
            }
            if(path.startsWith("/api/") && first[0].equals("POST") && json && length>=0 && length<=4096){
                byte[] body=new byte[length];
                new DataInputStream(in).readFully(body);
                String action=path.substring(5);
                String result;
                if(action.equals("network"))result=new JSONObject().put("urls",addresses()).toString();
                else result=dispatch(action,new String(body,StandardCharsets.UTF_8));
                reply(socket,new JSONObject(result).has("error")?400:200,"application/json",result.getBytes(StandardCharsets.UTF_8));
            }else if(first[0].equals("GET") && (path.equals("/") || path.matches("/[A-Za-z0-9_-]+\\.(js|html|css|png|webp|ttf)"))){
                String file=path.equals("/")?"index.html":path.substring(1);
                try(InputStream asset=getAssets().open("public/"+file)){
                    ByteArrayOutputStream out=new ByteArrayOutputStream();
                    byte[] buf=new byte[16384];int n;
                    while((n=asset.read(buf))!=-1)out.write(buf,0,n);
                    String type=file.endsWith(".js")?"text/javascript":file.endsWith(".css")?"text/css":file.endsWith(".png")?"image/png":file.endsWith(".ttf")?"font/ttf":"text/html";
                    reply(socket,200,type,out.toByteArray());
                }
            }else reply(socket,404,"text/plain",new byte[0]);
        }catch(Exception ignored){ /* Incomplete client request or closed connection. */ }
    }
    private JSONArray addresses() throws SocketException {
        JSONArray urls=new JSONArray();
        for(NetworkInterface n:Collections.list(NetworkInterface.getNetworkInterfaces())){
            if(!n.isUp() || n.isLoopback())continue;
            for(InetAddress a:Collections.list(n.getInetAddresses()))
                if(a instanceof Inet4Address && a.isSiteLocalAddress())urls.put("http://"+a.getHostAddress()+":"+PORT);
        }
        return urls;
    }
    private String dispatch(String action,String data)throws Exception {
        CompletableFuture<String> result=new CompletableFuture<>();
        String js="(()=>{try{return Majlis.request("+JSONObject.quote(action)+",JSON.parse("+JSONObject.quote(data)+"))}catch(e){return {error:e.message}}})()";
        runOnUiThread(()->engine.evaluateJavascript(js,result::complete));
        return result.get(6,TimeUnit.SECONDS);
    }
    private void reply(Socket socket,int status,String type,byte[] data)throws IOException {
        OutputStream out=socket.getOutputStream();
        String headers="HTTP/1.1 "+status+(status==200?" OK":" Error")+"\r\nContent-Type: "+type+"; charset=utf-8\r\nCache-Control: no-store\r\nContent-Length: "+data.length+"\r\nConnection: close\r\n\r\n";
        out.write(headers.getBytes(StandardCharsets.US_ASCII));out.write(data);out.flush();
    }
    @Override public void onDestroy(){
        try{if(listener!=null)listener.close();}catch(IOException ignored){}
        workers.shutdownNow();
        engine.destroy();screen.destroy();super.onDestroy();
    }
}
