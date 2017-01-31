#define REDPIN 3
#define GREENPIN 5
#define BLUEPIN 6
  
#define FADESPEED 4     // чем выше число, тем медленнее будет fade-эффект

  int r, g, b;
  
void setup() {
  pinMode(REDPIN, OUTPUT);
  pinMode(GREENPIN, OUTPUT);
  pinMode(BLUEPIN, OUTPUT);
  //enable в состояние вкл
  pinMode(4, OUTPUT);
  pinMode(7, OUTPUT);
  digitalWrite(4, LOW);
  digitalWrite(7, LOW);
}

void loop() {
  fadeColors(0,255,0,255,0,0);
  delay(1500);
  fadeColors(255,0,0,255,255,0);
  delay(1500);
  fadeColors(255,255,0,255,0,255);
  delay(1500);
  fadeColors(255,0,255,0,0,255);
  delay(1500);
  fadeColors(0,0,255,255,100,0);
  delay(3000);
  fadeColors(255,128,0,0,255,0);
  delay(1500);

  
//  
//  // fade от голубого к фиолетовому
//  for (r = 0; r < 256; r++) { 
//    analogWrite(REDPIN, r);
//    delay(FADESPEED);
//  }
//  // fade от фиолетового к красному
//  for (b = 255; b > 0; b--) { 
//    analogWrite(BLUEPIN, b);
//    delay(FADESPEED);
//  } 
//  // fade от красного к желтому
//  for (g = 0; g < 256; g++) { 
//    analogWrite(GREENPIN, g);
//    delay(FADESPEED);
//  } 
//  // fade от желтого к зеленому
//  for (r = 255; r > 0; r--) { 
//    analogWrite(REDPIN, r);
//    delay(FADESPEED);
//  } 
//  // fade от зеленого к зеленовато-голубому
//  for (b = 0; b < 256; b++) { 
//    analogWrite(BLUEPIN, b);
//    delay(FADESPEED);
//  } 
//  // fade от зеленовато-голубого к голубому
//  for (g = 255; g > 0; g--) { 
//    analogWrite(GREENPIN, g);
//    delay(FADESPEED);
//  } 
}

void setColor(int r, int g, int b){
  r=255-r;
  g=255-g;
  b=255-b;
  analogWrite(REDPIN, r);
  analogWrite(GREENPIN, g);
  analogWrite(BLUEPIN, b);
}

void fadeColors(int r1, int g1, int b1, int r2, int g2, int b2){
  //преобразование из RGB
  
  if (r1<r2){
    for (int r = r1; r <= r2; r++) { 
      analogWrite(REDPIN, r);
      delay(FADESPEED);
    }
  }
  else{
    for (int r = r1; r >= r2; r--) { 
      analogWrite(REDPIN, r);
      delay(FADESPEED);
    }
  }
  if (g1<g2){
    for (int g = g1; g <= g2; g++) { 
      analogWrite(GREENPIN, g);
      delay(FADESPEED);
    }
  }
  else{
    for (int g = g1; g >= g2; g--) { 
      analogWrite(GREENPIN, g);
      delay(FADESPEED);
    }
  }
  if (b1<b2){
    for (int b = b1; b <= b2; b++) { 
      analogWrite(BLUEPIN, b);
      delay(FADESPEED);
    }
  }
  else{
    for (int b = b1; b >= b2; b--) { 
      analogWrite(BLUEPIN, b);
      delay(FADESPEED);
    }
  }
}

