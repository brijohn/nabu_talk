---
title: "Tech Talk: The NABU PC"
outputs: ["Reveal"]
weight:  2
---

## Nabu Architecture

```cpp{3|5-8|9-12}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);   // 3.58 Mhz

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6); // 1.79 Mhz
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
}
```

---

## Memory Map
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{4}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{3}
void nabupc_state::memory_map(address_map &map)
{
	map(0x0000, 0xffff).ram();
}
```

{{< /div >}}
{{< div class="fragment" >}}

```cpp{2|3-5|6-7}
ROM_START( nabupc )
	ROM_REGION(0x2000, "bios", 0)
	ROM_SYSTEM_BIOS(0, "reva", "4k BIOS (Rev A)")
	ROMX_LOAD("reva-2732.bin", 0x0000, 0x1000, CRC(...) SHA1(...), ROM_BIOS(0))
	ROM_RELOAD(0x1000, 0x1000)
	ROM_SYSTEM_BIOS(1, "revb", "8k BIOS - Floppy support (Rev B)")
	ROMX_LOAD("revb-2764.bin", 0x0000, 0x2000, CRC(...) SHA1(...), ROM_BIOS(1))
ROM_END
```

{{< /div >}}
{{< div class="fragment current-visible" hide="1" >}}

```cpp{4}
void nabupc_state::memory_map(address_map &map)
{
	map(0x0000, 0xffff).ram();
	map(0x0000, 0x1fff).view(m_rom_view);
}
```

```cpp{3-4}
void nabupc_state::machine_reset()
{
	m_rom_view[0].install_rom(0x0000, 0x1fff, m_rom_base);
	m_rom_view.select(0);
}
```

{{< /div >}}
{{% /div %}}

---

## I/O Memory
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{5}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);
	m_maincpu->set_addrmap(AS_IO, &nabupc_state::io_map);

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
}
```

{{< /div >}}
{{< div class="fragment current-visible small" index=0" >}}

```cpp{}
void nabupc_state::io_map(address_map &map)
{
	map(0x00, 0x00).w(FUNC(nabupc_state::control_w));
	map(0x40, 0x40).r(m_ay8910, FUNC(ay8910_device::data_r));
	map(0x40, 0x41).w(m_ay8910, FUNC(ay8910_device::data_address_w));
	map(0xa0, 0xa1).rw(m_tms9918a, FUNC(tms9918a_device::read), FUNC(tms9918a_device::write));
}
```

{{< /div >}}
{{< div class="fragment" >}}

```cpp{4-6|7-11}
void nabupc_state::control_w(uint8_t data)
{
	m_control = data;
	for (int i = 3 ; i < 6 ; ++i) {
		m_leds[6 - i] = BIT(m_control, i);
	}
	if ((m_control & 1) == 0) {
		m_rom_view.select(0);
	} else {
		m_rom_view.disable();
	}
}
```

{{< /div >}}
{{% /div %}}

---

## NABU Interrupts
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

![Interrupts](/interrupts/interrupts1.png 'Interrupts')

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

![Interrupts](/interrupts/interrupts2.png 'Interrupts')

{{< /div >}}
{{< div class="fragment current-visible" >}}

![Interrupts](/interrupts/interrupts3.png 'Interrupts')

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{6,12,17-18}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);
	m_maincpu->set_addrmap(AS_IO, &nabupc_state::io_map);
	m_maincpu->set_irq_acknowledge_callback(FUNC(nabupc_state::int_ack_cb));

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);
	m_tms9918a->int_callback().set(*this, FUNC(nabupc_state::int_w<4>));

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
	m_ay8910->port_b_read_callback().set(FUNC(nabupc_state::psg_portb_r));
	m_ay8910->port_a_write_callback().set(FUNC(nabupc_state::psg_porta_w));
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
uint8_t nabupc_state::psg_portb_r()
{
	return m_portb;
}

void nabupc_state::psg_porta_w(uint8_t data)
{
	if (data != m_porta) {
		m_porta = data;
		update_irq();
	}
}

template <unsigned N>
void nabupc_state::int_w(int state)
{
	BIT_SET(m_int_lines, N, state);
	update_irq();
}

IRQ_CALLBACK_MEMBER(nabupc_state::int_ack_cb)
{
	uint32_t vector = m_portb & 0xe;
	return vector;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void nabupc_state::update_irq()
{
	uint8_t interrupts = ~(m_porta & m_int_lines);

	m_portb &= 0xf0;
	uint8_t out = f9318(interrupts);
	m_portb |= bitswap(out, 2, 1, 0, 3);
	m_maincpu->set_input_line(INPUT_LINE_IRQ0, !(BIT(out, 4)));
}
```

{{< /div >}}
{{% /div %}}

---

## Keyboard Port

{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{20-27}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);
	m_maincpu->set_addrmap(AS_IO, &nabupc_state::io_map);
	m_maincpu->set_irq_acknowledge_callback(FUNC(nabupc_state::int_ack_cb));

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);
	m_tms9918a->int_callback().set(*this, FUNC(nabupc_state::int_w<4>));

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
	m_ay8910->port_b_read_callback().set(FUNC(nabupc_state::psg_portb_r));
	m_ay8910->port_a_write_callback().set(FUNC(nabupc_state::psg_porta_w));
	
	I8251(config, m_kbduart, 10.738635_MHz_XTAL / 6);
	m_kbduart->rxrdy_handler().set(*this, FUNC(nabupc_state::int_w<5>));

	clock_device &sclk(CLOCK(config, "sclk", 10.738635_MHz_XTAL / 96));
	sclk.signal_handler().set(m_kbduart, FUNC(i8251_device::write_rxc));

	rs232_port_device &kbd(RS232_PORT(config, "kbd", keyboard_devices, "nabu_hle"));
	kbd.rxd_handler().set(m_kbduart, FUNC(i8251_device::write_rxd));
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{6}
void nabupc_state::io_map(address_map &map)
{
	map(0x00, 0x00).w(FUNC(nabupc_state::control_w));
	map(0x40, 0x40).r(m_ay8910, FUNC(ay8910_device::data_r));
	map(0x40, 0x41).w(m_ay8910, FUNC(ay8910_device::data_address_w));
	map(0x90, 0x91).rw(m_kbduart, FUNC(i8251_device::read), FUNC(i8251_device::write));
	map(0xa0, 0xa1).rw(m_tms9918a, FUNC(tms9918a_device::read), FUNC(tms9918a_device::write));
}
```

```cpp{}
static void keyboard_devices(device_slot_interface &device)
{
	device.option_add("nabu_hle", NABUPC_HLE_KEYBOARD);
}
```

{{< /div >}}
{{% /div %}}

---

## Keyboard Serial Protocol
{{% div class="r-stack" %}}
{{% div class="fragment fade-out smaller" index="0" %}}

|  Scan Code  |          Function          |
|-------------|----------------------------|
| 0x00 - 0x7F |   ASCII                    |
|     0x90    |   E1 - Multiple Keypress   |
|     0x91    |   E2 - RAM Fault           |
|     0x92    |   E3 - ROM Fault           |
|     0x93    |   E4 - Illegal ISR         |
|     0x94    |   E5 - Software Watchdog   |
|     0x95    |   E6 - Power on/Reset      |
| 0xE0 , 0xF0 |   Right Arrow              |
| 0xE1 , 0xF1 |   Left Arrow               |
| 0xE2 , 0xF2 |   Up Arrow                 |
| 0xE3 , 0xF3 |   Down Arrow               |
| 0xE4 , 0xF4 |   Page Right               |
| 0xE5 , 0xF5 |   Page Left                |
| 0xE6 , 0xF6 |   NO                       |
| 0xE7 , 0xF7 |   YES                      |
| 0xE8 , 0xF8 |   SYM                      |
| 0xE9 , 0xF9 |   PAUSE                    |
| 0xEA , 0xFA |   TV/NABU                  |
| 0x80 - 0x83 |   Joystick 1 - 4           |

{{% /div %}}
{{% div class="fragment current-visible smaller" index="0" %}}

|  Bit  |  Function |
|-------|-----------|
|   D7  | 1 - Fixed |
|   D6  | 0 - Fixed |
|   D5  | 1 - Fixed |
|   D4  |   Fire    |
|   D3  |    Up     |
|   D2  |   Right   |
|   D1  |   Down    |
|   D0  |   Left    |


> Joystick 1 Fire pressed -> 0x80 0xB0

> Joystick 2 Up and Left  -> 0x81 0xA9

{{% /div %}}
{{% /div %}}

---

## HCCA Port
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{29-42}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);
	m_maincpu->set_addrmap(AS_IO, &nabupc_state::io_map);
	m_maincpu->set_irq_acknowledge_callback(FUNC(nabupc_state::int_ack_cb));

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);
	m_tms9918a->int_callback().set(*this, FUNC(nabupc_state::int_w<4>));

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
	m_ay8910->port_b_read_callback().set(FUNC(nabupc_state::psg_portb_r));
	m_ay8910->port_a_write_callback().set(FUNC(nabupc_state::psg_porta_w));
	
	I8251(config, m_kbduart, 10.738635_MHz_XTAL / 6);
	m_kbduart->rxrdy_handler().set(*this, FUNC(nabupc_state::int_w<5>));
	
	clock_device &sclk(CLOCK(config, "sclk", 10.738635_MHz_XTAL / 96));
	sclk.signal_handler().set(m_kbduart, FUNC(i8251_device::write_rxc));

	rs232_port_device &kbd(RS232_PORT(config, "kbd", keyboard_devices, "nabu"));
	kbd.rxd_handler().set(m_kbduart, FUNC(i8251_device::write_rxd));

	AY31015(config, m_hccauart);
	m_hccauart->set_auto_rdav(true);
	m_hccauart->write_dav_callback().set(FUNC(nabupc_state::int_w<7>));
	m_hccauart->write_tbmt_callback().set(FUNC(nabupc_state::int_w<6>));
	m_hccauart->write_fe_callback().set(FUNC(nabupc_state::hcca_fe_w));
	m_hccauart->write_or_callback().set(FUNC(nabupc_state::hcca_oe_w));
	m_hccauart->write_so_callback().set("hcca", FUNC(rs232_port_device::write_txd));

 	clock_device &pclk(CLOCK(config, "pclk", 10.738635_MHz_XTAL / 6));
 	pclk.signal_handler().set(m_hccauart, FUNC(ay31015_device::write_rcp));
 	pclk.signal_handler().append(m_hccauart, FUNC(ay31015_device::write_tcp));

	rs232_port_device &hcca(RS232_PORT(config, "hcca", hcca_devices, "null_modem"));
	hcca.rxd_handler().set(m_hccauart, FUNC(ay31015_device::write_si));
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{6}
void nabupc_state::io_map(address_map &map)
{
	map(0x00, 0x00).w(FUNC(nabupc_state::control_w));
	map(0x40, 0x40).r(m_ay8910, FUNC(ay8910_device::data_r));
	map(0x40, 0x41).w(m_ay8910, FUNC(ay8910_device::data_address_w));
	map(0x80, 0x80).rw(m_hccauart, FUNC(ay31015_device::receive), FUNC(ay31015_device::transmit));
	map(0x90, 0x91).rw(m_kbduart, FUNC(i8251_device::read), FUNC(i8251_device::write));
	map(0xa0, 0xa1).rw(m_tms9918a, FUNC(tms9918a_device::read), FUNC(tms9918a_device::write));
}
```

```cpp{}
void nabupc_state::hcca_fe_w(int state)
{
	BIT_SET(m_portb, 5, state);
}

void nabupc_state::hcca_oe_w(int state)
{
	BIT_SET(m_portb, 6, state);
}

static void hcca_devices(device_slot_interface &device)
{
	device.option_add("null_modem",    NULL_MODEM);
}
```

{{< /div >}}
{{% /div %}}

---

## Printer Port
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{44-47}
void nabupc_state::nabupc(machine_config &config)
{
	Z80(config, m_maincpu, 10.738635_MHz_XTAL / 3);
	m_maincpu->set_addrmap(AS_PROGRAM, &nabupc_state::memory_map);
	m_maincpu->set_addrmap(AS_IO, &nabupc_state::io_map);
	m_maincpu->set_irq_acknowledge_callback(FUNC(nabupc_state::int_ack_cb));

	SCREEN(config, m_screen, SCREEN_TYPE_RASTER);
	TMS9918A(config, m_tms9918a, 10.738635_MHz_XTAL);
	m_tms9918a->set_screen(m_screen);
	m_tms9918a->set_vram_size(0x4000);
	m_tms9918a->int_callback().set(*this, FUNC(nabupc_state::int_w<4>));

	SPEAKER(config, m_speaker).front_center();
	AY8910(config, m_ay8910, 10.738635_MHz_XTAL / 6);
	m_ay8910->add_route(ALL_OUTPUTS, m_speaker, 0.3);
	m_ay8910->port_b_read_callback().set(FUNC(nabupc_state::psg_portb_r));
	m_ay8910->port_a_write_callback().set(FUNC(nabupc_state::psg_porta_w));
	
	I8251(config, m_kbduart, 10.738635_MHz_XTAL / 6);
	m_kbduart->rxrdy_handler().set(*this, FUNC(nabupc_state::int_w<5>));
	
	clock_device &sclk(CLOCK(config, "sclk", 10.738635_MHz_XTAL / 96));
	sclk.signal_handler().set(m_kbduart, FUNC(i8251_device::write_rxc));

	rs232_port_device &kbd(RS232_PORT(config, "kbd", keyboard_devices, "nabu"));
	kbd.rxd_handler().set(m_kbduart, FUNC(i8251_device::write_rxd));

	AY31015(config, m_hccauart);
	m_hccauart->set_auto_rdav(true);
	m_hccauart->write_dav_callback().set(FUNC(nabupc_state::int_w<7>));
	m_hccauart->write_tbmt_callback().set(FUNC(nabupc_state::int_w<6>));
	m_hccauart->write_fe_callback().set(FUNC(nabupc_state::hcca_fe_w));
	m_hccauart->write_or_callback().set(FUNC(nabupc_state::hcca_oe_w));
	m_hccauart->write_so_callback().set("hcca", FUNC(rs232_port_device::write_txd));

 	clock_device &pclk(CLOCK(config, "pclk", 10.738635_MHz_XTAL / 6));
 	pclk.signal_handler().set(m_hccauart, FUNC(ay31015_device::write_rcp));
 	pclk.signal_handler().append(m_hccauart, FUNC(ay31015_device::write_tcp));

	rs232_port_device &hcca(RS232_PORT(config, "hcca", hcca_devices, "null_modem"));
	hcca.rxd_handler().set(m_hccauart, FUNC(ay31015_device::write_si));
	
	output_latch_device &prndata(OUTPUT_LATCH(config, "prndata"));
	CENTRONICS(config, m_centronics, centronics_devices, nullptr);
	m_centronics->set_output_latch(prndata);
	m_centronics->busy_handler().set(FUNC(nabupc_state::centronics_busy_handler));
}

```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{9}
void nabupc_state::io_map(address_map &map)
{
	map(0x00, 0x00).w(FUNC(nabupc_state::control_w));
	map(0x40, 0x40).r(m_ay8910, FUNC(ay8910_device::data_r));
	map(0x40, 0x41).w(m_ay8910, FUNC(ay8910_device::data_address_w));
	map(0x80, 0x80).rw(m_hccauart, FUNC(ay31015_device::receive), FUNC(ay31015_device::transmit));
	map(0x90, 0x91).rw(m_kbduart, FUNC(i8251_device::read), FUNC(i8251_device::write));
	map(0xa0, 0xa1).rw(m_tms9918a, FUNC(tms9918a_device::read), FUNC(tms9918a_device::write));
	map(0xb0, 0xb0).w("prndata", FUNC(output_latch_device::write));
}
```

```cpp{4}
void nabupc_state::control_w(uint8_t data)
{
	m_control = data;
	m_centronics->write_strobe(BIT(m_control, 2));
	for (int i = 3 ; i < 6 ; ++i) {
		m_leds[6 - i] = BIT(m_control, i);
	}
	if ((m_control & 1) == 0) {
		m_rom_view.select(0);
	} else {
		m_rom_view.disable();
	}
}
```

```cpp{}
void nabupc_state::centronics_busy_handler(uint8_t state)
{
	BIT_SET(m_portb, 4, state);
}
```

{{< /div >}}
{{% /div %}}
