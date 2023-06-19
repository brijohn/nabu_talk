---
title: "Tech Talk: The NABU PC"
outputs: ["Reveal"]
weight:  4
---


## HCCA - Serial Protocol
{{% div class="smaller" %}}

| Description |      NABU      |     |     Adapter    |  Description  |
|-------------|----------------|-----|----------------|---------------|
|    Hello    |      0x83      |  >  |                |               |
|             |                |  <  | 0x10 0x06 0xE4 |  Ack/Confirm  |
|  Get Status |      0x82      |  >  |                |               |
|             |                |  <  |    0x10 0x06   |      Ack      |
|   Channel   |      0x01      |  >  |                |               |
|             |                |  <  | 0x1F 0x10 0xE1 |   Finished    |
|  Set Status |      0x81      |  >  |                |               |
|             |                |  <  |    0x10 0x06   |      Ack      |
|   Loading   |   0x8F 0x05    |  >  |                |               |
|             |                |  <  |      0xE4      |    Confirm    |
| Packet Req  |      0x84      |  >  |                |               |
|             |                |  <  |    0x10 0x06   |      Ack      |
| Packet Num  | 0xNN           |  >  |                |               |
| Segment Num | 0xNN 0xNN 0xNN |  >  |                |               |
|             |                |  <  |    0x91 0xE4   |  Authorized   |
|     Ack     |   0x10 0x06    |  >  |                |               |
|             |                |  <  |    [PACKET]    |  Packet Data  |
|             |                |  <  |    0x10 0xE1   |   Finished    |

{{% /div %}}

---

## HCCA - Serial Packets

```cpp{}
struct packet {
	uint8_t segment_id[3];   // ID of segment
	uint8_t packet_number;   // Current packet number
	uint8_t owner;           // Owner
	uint8_t tier[4];         // Tier
	uint8_t mbytes[2];       // Mystery Bytes always 0x7F 0x80
	uint8_t type;            // Type of packet
	uint8_t pak_number[2];   // Pak Number
	uint8_t offset[2];       // File Offset
	uint8_t data[993];       // data + crc16 (data max size is 991)
};
```

---

## HCCA MAME State Machine
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{}
void network_adapter_base::received_byte(uint8_t byte)
{
	switch (m_state) {
	case state::IDLE:
		idle(byte);
		break;
	case state::CHANNEL_REQUEST:
		channel_request(byte);
		break;
	case state::SEGMENT_REQUEST:
		segment_request(byte);
		break;
	case state::SETSTATUS_REQUEST:
		set_status(byte);
		break;
	case state::GETSTATUS_REQUEST:
		get_status(byte);
		break;
	case state::SEND_SEGMENT:
		send_segment(byte);
		break;
 	}
}
```

{{< /div >}}
{{< div class="fragment current-visible small" index="0" >}}

```cpp{}
void network_adapter_base::idle(uint8_t byte)
{
	m_substate = 0;
	switch (byte) {
	case 0x85:
		transmit_byte(0x10);
		transmit_byte(0x06);
		m_state = state::CHANNEL_REQUEST;
		break;
	case 0x84:
		transmit_byte(0x10);
		transmit_byte(0x06);
		m_state = state::SEGMENT_REQUEST;
		break;
	case 0x83:
		transmit_byte(0x10);
		transmit_byte(0x06);
		transmit_byte(0xe4);
		break;
	case 0x82:
		transmit_byte(0x10);
		transmit_byte(0x06);
		m_state = state::GETSTATUS_REQUEST;
		break;
	case 0x81:
		transmit_byte(0x10);
		transmit_byte(0x06);
		m_state = state::SETSTATUS_REQUEST;
		break;
	}
 }
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void network_adapter_base::set_status(uint8_t byte)
{
	if (m_substate == 1) {
		transmit_byte(0xe4);
		m_state = state::IDLE;
	}
	++m_substate;
}
 
void network_adapter_base::get_status(uint8_t byte)
{
	if (byte == 0x01) {
		transmit_byte(bool(m_config->read() & 1) ? 0x9f : 0x1f);
 	}
	transmit_byte(0x10);
	transmit_byte(0xe1);
	m_state = state::IDLE;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void network_adapter_base::channel_request(uint8_t byte)
{
	if (m_substate == 0) {
		m_channel = (m_channel & 0xff00) | (byte);
	} else if (m_substate == 1) {
		m_channel = (m_channel & 0xff) | (byte << 8);
		transmit_byte(0xe4);
		m_state = state::IDLE;
	}
	++m_substate;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void network_adapter_base::segment_request(uint8_t byte)
{
	static uint32_t segment_id = 0;

	if (m_substate == 0) {
		m_packet = byte;
	} else if (m_substate == 1) {
		segment_id = (segment_id & 0xffff00) | (byte);
	} else if (m_substate == 2) {
		segment_id = (segment_id & 0xff00ff) | (byte << 8);
	} else if (m_substate == 3) {
		segment_id = (segment_id & 0xffff) | (byte << 16);
		transmit_byte(0xe4);
		if (!load_segment(segment_id)) {
			transmit_byte(0x91);
			m_state = state::SEND_SEGMENT;
			m_substate = 0;
			m_segment = segment_id;
			return;
		} else {
			transmit_byte(0x90);
			m_state = state::IDLE;
			m_segment = 0;
		}
	}
	++m_substate;
}
```

{{< /div >}}
{{< div class="fragment current-visiblei smaller" >}}

```cpp{}
void network_adapter_base::send_segment(uint8_t byte)
{
	if (m_substate == 0) {
		if (byte != 0x10) {
			m_state = state::IDLE;
			m_substate = 0;
			return;
		}
	} else if (m_substate == 1) {
		if (byte != 0x06) {
			m_state = state::IDLE;
			m_substate = 0;
			return;
		}
		m_pak_offset = 0;
		if (!parse_segment(m_segment_data.get(), m_segment_length)) {
			m_segment_timer->adjust(attotime::zero, 0, attotime::from_hz(7'500));
		} else {
			transmit_byte(0x10);
			transmit_byte(0x06);
			transmit_byte(0xe4);
		}
		m_state = state::IDLE;
	}

	++m_substate;
}

TIMER_CALLBACK_MEMBER(network_adapter_base::segment_tick)
{
	char * data = (char*)&m_pakcache[m_packet];
	if (data[m_pak_offset] == 0x10) {
		transmit_byte(data[m_pak_offset]);
	}
	transmit_byte(data[m_pak_offset++]);
	if (m_pak_offset >= m_pakcache[m_packet].length) {
		transmit_byte(0x10);
		transmit_byte(0xe1);
		m_segment_timer->reset();
	}
}
```

{{< /div >}}
{{% /div %}}
