#include <Wire.h>
#include <Adafruit_MotorShield.h>
#include <Adafruit_PWMServoDriver.h>
//#include "utility/Adafruit_PWMServoDriver.h>

#define POT_MAX_VAL 1024
#define POT_MIN_VAL 0

#define POT_X_MAX_VAL 1021
#define POT_X_MIN_VAL 0

#define POT_Y_MAX_VAL 1017
#define POT_Y_MIN_VAL 6

#define POT_X 0
#define POT_Y 1
#define MOTOR_X_NUMBER  1
#define MOTOR_Y_NUMBER  2

/* MSG's codes: */
#define MSG_MOVE_XY 0
#define MSG_MOVE_X 1
#define MSG_INFO_Y 2

/* Setting up motors and shield */
Adafruit_MotorShield AFMS = Adafruit_MotorShield();
Adafruit_DCMotor *motorX = AFMS.getMotor(MOTOR_X_NUMBER);
Adafruit_DCMotor *motorY = AFMS.getMotor(MOTOR_Y_NUMBER);

 /* Returns the value, in form of %, that represents the position of the potentiomenter
 for the motor which deals with X coordinates*/
long getPosX() {
  word val = analogRead(POT_X);
  return map(val, POT_X_MIN_VAL, POT_X_MAX_VAL, 0, 99);
 }

/* Returns the value, in form of %, that represents the position of the potentiomenter
 for the motor which deals with Y coordinates*/
long getPosY(){
  word val = analogRead(POT_Y);
  return map(val, POT_Y_MIN_VAL, POT_Y_MAX_VAL, 0, 99);
}

/* Moves motor X to the "dest" position (%) with a tolerance of "tol", a minimum (base) speed of
"base_speed", a maximum speed of "max_speed", a delay between polls (check if dest reached) of "del"
millisencos and a maximum number of tries "max_tries".*/
void moveX(byte dest, byte tol, byte base_speed, byte max_speed, word del, byte max_tries) {
  long posY = getPosY();
  long posX = getPosX();
  byte speed_diff = max_speed - base_speed;
  // if pos == 0 -> motor_speed = base_speed.
  byte motor_speed = base_speed + (posY / 99.0) * speed_diff;
  motorX->setSpeed(motor_speed);

  byte tries = 0;

  int diff = dest - posX;
  boolean reached = abs(diff) <= tol;

  while(!reached && (tries <= max_tries)) {
    tries += 1;
    if (diff > 0) {
      motorX->run(FORWARD);
    } else {
      motorX->run(BACKWARD);
    }

    delay(del);

    diff = dest - getPosX();
    reached = abs(diff) <= tol;
  }

  motorX->run(RELEASE);
}


/* Moves motor Y to the "dest" position (%) with a tolerance of "tol", a minimum (base) speed of
"base_speed", a maximum speed of "max_speed", a delay between polls (check if dest reached) of "del"
millisencos and a maximum number of tries "max_tries".*/
void moveY(byte dest, byte tol, byte base_speed, byte max_speed, word del, byte max_tries) {
  long posY = getPosY();
  long posX = getPosX();
  byte speed_diff = max_speed - base_speed;
  // if pos == 99 -> motor_speed = base_speed.
  byte motor_speed = base_speed + ((99 - posX) / 99.0) * speed_diff;
  motorY->setSpeed(motor_speed);

  byte tries = 0;
  int diff = dest - posY;
  boolean reached = abs(diff) <= tol;

  while (!reached && (tries <= max_tries)) {
    tries += 1;

    if (diff > 0) {
      motorY->run(FORWARD);
    } else {
      motorY->run(BACKWARD);
    }

    delay(del);

    diff = dest - getPosY();
    reached = abs(diff) <= tol;
  }

  motorY->run(RELEASE);
}

void mv_motor(byte motor_n, byte dest, byte tol, byte base_speed, byte max_speed, word del, byte max_tries) {
  if (motor_n == 1) {
    moveX(dest, tol, base_speed, max_speed, del, max_tries);
  } else if(motor_n == 2) {
    moveY(dest, tol, base_speed, max_speed, del, max_tries);
  } else {
    Serial.println("Error mv_motor");
  }
}

void moveXY(byte dest_x, byte dest_y, byte tol, byte motor_speed, word del, byte max_tries) {
  moveX(dest_x, tol, motor_speed, motor_speed, del, max_tries);
  moveY(dest_y, tol, motor_speed, motor_speed, del, max_tries);
}

/* Reads a message as a "String" form serial port.
Serial.setTimeout() needed.*/
String readMsg() {
  String msg;
  msg = Serial.readStringUntil('\n');

  if (msg.length() > 0) {
    /*
    Serial.print("Readed: ");
    Serial.println(msg);
    */
    return msg;
  }
  return "";
}

boolean parseMsg(String msg, word *msg_info) {
  if (!msg.equals("")) {
    msg_info[0] = msg.substring(0,1).toInt();
    if (msg_info[0] == 1 || msg_info[0] == 2) {
      msg_info[1] = msg.substring(1, 3).toInt(); // Destination (__)
      msg_info[2] = msg.substring(3, 5).toInt(); // Tolerance. (__)
      msg_info[3] = msg.substring(5, 8).toInt(); // Base speed. (___)
      msg_info[4] = msg.substring(8, 11).toInt(); // Max speed. (___)
      msg_info[5] = msg.substring(11, 14).toInt(); // Poll delay. (___)
      msg_info[6] = msg.substring(14, 17).toInt(); // Max tries. (___)
      return true;
    } else {
      msg_info[1] = msg.substring(1, 3).toInt(); // Destination X. (__)
      msg_info[2] = msg.substring(3, 5).toInt(); // Destination Y. (__)
      msg_info[3] = msg.substring(5, 7).toInt(); // Tolerance.(__)
      msg_info[4] = msg.substring(7, 10).toInt(); // Speed. (___)
      msg_info[5] = msg.substring(10, 13).toInt(); // Poll delay. (___)
      msg_info[6] = msg.substring(13, 16).toInt(); // Max tries. (___)
      return true;
    }
  }
  return false;
}

// Write the position of the sliders in the serial port
// in the form "X,Y<EOL>"
void writeInfo() {
  Serial.print(getPosX());
  Serial.print(",");
  Serial.println(getPosY());
}

void setup() {
  // put your setup code here, to run once:
  // put your setup code here, to run once:
  Serial.begin(9600);
  while (!Serial) {
    ; // wait for serial port to connect. Needed for native USB
  }
  Serial.setTimeout(10000);

  AFMS.begin();
  motorX->setSpeed(145);
  motorY->setSpeed(145);
  motorX->run(RELEASE);
  motorY->run(RELEASE);
}

// Global vars:
word msg_info[30];
String msg;
byte motor_number;
byte dest;
byte dest_x;
byte dest_y;
byte tol;
byte base_speed;
byte max_speed;
word del;
byte max_tries;

void loop() {
  // put your main code here, to run repeatedly:
  msg = readMsg();

  if (parseMsg(msg, msg_info)) {
    if (msg_info[0] == 1 || msg_info[0] == 2) {
      motor_number = msg_info[0];
      dest = msg_info[1];
      tol  = msg_info[2];
      base_speed = msg_info[3];
      max_speed  = msg_info[4];
      del = msg_info[5];
      max_tries = msg_info[6];

      mv_motor(motor_number, dest, tol, base_speed, max_speed, del, max_tries);
    } else if (msg_info[0] == 0) {
      dest_x = msg_info[1];
      dest_y = msg_info[2];
      tol  = msg_info[3];
      base_speed = msg_info[4];
      del = msg_info[5];
      max_tries = msg_info[6];

      moveXY(dest_x, dest_y, tol, base_speed, del, max_tries);
    }
    writeInfo();
  }
}
