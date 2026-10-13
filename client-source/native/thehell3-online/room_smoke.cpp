#include "room_transport.h"
#include <windows.h>
#include <iostream>
#include <string>
#include <cstdlib>
int main(int argc,char **argv){
 if(argc!=4)return 2;std::string ticket;std::getline(std::cin,ticket);
 if(!rfd_room_open(argv[1],static_cast<unsigned short>(std::atoi(argv[2])),ticket.c_str(),argv[3])){std::cerr<<rfd_room_error()<<"\n";return 1;}
 int self=rfd_room_slot();std::cout<<"{\"connected\":true,\"slot\":"<<self<<",\"startsWorld\":"<<rfd_room_starts_world()<<",\"seed\":"<<rfd_room_seed()<<"}"<<std::endl;
 std::string command;
 while(std::getline(std::cin,command)){
  if(command=="quit")break;
  if(command=="turn"){
   if(!rfd_room_send_turn(1234+self))return 3;uint32_t values[4],sizes[4],status[4];auto deadline=GetTickCount64()+6000;
   while(!rfd_room_receive_turns(values,sizes,status)&&GetTickCount64()<deadline)Sleep(2);
   if(sizes[self]!=4){std::cerr<<"Turn synchronization timed out\n";return 4;}
   unsigned int count=0;for(int i=0;i<4;i++)if(status[i]&0x20000){if(values[i]!=1234+i)return 5;count++;}
   std::cout<<"{\"turn\":true,\"players\":"<<count<<"}"<<std::endl;
  }
 }
 rfd_room_close();return 0;
}
