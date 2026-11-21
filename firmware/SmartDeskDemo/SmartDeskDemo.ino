#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <Adafruit_NeoPixel.h>
#include "web_page.h"

// Verify on the physical board. Try 48 first; some S3 revisions use 38.
#define RGB_PIN 48
#define LED_TEST_ONLY false
const char* AP_NAME = "SmartDesk-Demo";
const char* AP_PASSWORD = "DeskDemo2026";
WebServer server(80);
Adafruit_NeoPixel pixel(1, RGB_PIN, NEO_GRB + NEO_KHZ800);
String status = "free", message = "Ready when you are.";
uint32_t duration = 1500, remaining = 1500, deadline = 0;
bool running = false;
void updateTimer(){if(running){int32_t delta=(int32_t)(deadline-millis());remaining=delta>0?(delta+999)/1000:0;if(!remaining){running=false;status="free";}}}
void updateLed(){uint32_t c=status=="meeting"?pixel.Color(60,0,0):status=="focus"?pixel.Color(0,15,60):pixel.Color(0,50,0);pixel.setPixelColor(0,c);pixel.show();}
void sendState(){updateTimer();updateLed();JsonDocument doc;doc["status"]=status;doc["message"]=message;doc["duration"]=duration;doc["remaining"]=remaining;doc["running"]=running;doc["device"]="ESP32-S3 connected · physical RGB LED";String output;serializeJson(doc,output);server.sendHeader("Cache-Control","no-store");server.send(200,"application/json; charset=utf-8",output);}
void handleAction(){updateTimer();String a=server.arg("action"),v=server.arg("value");
 if(a=="status"&&(v=="free"||v=="meeting"||v=="focus"))status=v;
 else if(a=="message"){if(v.length()>320){server.send(400,"text/plain","Message too long");return;}message=v;}
 else if(a=="start"){String raw=server.arg("seconds");long s=raw.toInt();bool valid=raw.length()>0;for(size_t i=0;i<raw.length();i++)if(raw[i]<'0'||raw[i]>'9')valid=false;if(!valid||s<1||s>7200){server.send(400,"text/plain","Invalid duration");return;}duration=remaining=s;deadline=millis()+s*1000UL;running=true;status="focus";}
 else if(a=="pause")running=false;
 else if(a=="resume"){if(remaining){deadline=millis()+remaining*1000UL;running=true;status="focus";}}
 else if(a=="reset"){running=false;remaining=duration;}
 else {server.send(400,"text/plain","Invalid action");return;}
 sendState();}
void setup(){Serial.begin(115200);pixel.begin();pixel.clear();pixel.show();if(LED_TEST_ONLY)return;WiFi.mode(WIFI_AP);WiFi.softAP(AP_NAME,AP_PASSWORD);Serial.print("Open http://");Serial.println(WiFi.softAPIP());server.on("/",HTTP_GET,[]{server.send_P(200,"text/html; charset=utf-8",WEB_PAGE);});server.on("/api/state",HTTP_GET,sendState);server.on("/api/action",HTTP_POST,handleAction);server.onNotFound([]{server.send(404,"text/plain","Not found");});server.begin();updateLed();}
void loop(){if(LED_TEST_ONLY){uint8_t phase=(millis()/1200)%3;pixel.setPixelColor(0,phase==0?pixel.Color(50,0,0):phase==1?pixel.Color(0,50,0):pixel.Color(0,0,50));pixel.show();delay(20);return;}server.handleClient();updateTimer();static uint32_t last=0;if(millis()-last>100){updateLed();last=millis();}delay(2);}
