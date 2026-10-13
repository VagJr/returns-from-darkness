#pragma once
#include <stdint.h>
#ifdef __cplusplus
extern "C" {
#endif
int rfd_room_open(const char *host, unsigned short port, const char *ticket, const char *hash);
void rfd_room_close(void);
int rfd_room_alive(void);
int rfd_room_slot(void);
int rfd_room_starts_world(void);
uint32_t rfd_room_seed(void);
unsigned int rfd_room_difficulty(void);
int rfd_room_send_message(int destination, const void *data, unsigned int size);
int rfd_room_receive_message(unsigned int *sender, void **data, unsigned int *size);
int rfd_room_send_turn(uint32_t value);
int rfd_room_receive_turns(uint32_t values[4], uint32_t sizes[4], uint32_t status[4]);
unsigned int rfd_room_turns_waiting(int owner);
int rfd_room_event(int *player, uint32_t *reason);
const char *rfd_room_error(void);
#ifdef __cplusplus
}
#endif
