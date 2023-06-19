---
title: "Tech Talk: The NABU PC"
outputs: ["Reveal"]
weight:  3
---

## Expansion Card Photos

{{% div class="r-stack" %}}
{{% div class="fragment fade-out" index="0" %}}

![Floppy](/cards/floppy.jpg 'Floppy')

{{% /div %}}
{{% div class="fragment current-visible" index="0" %}}

![RS232](/cards/rs232.jpg 'RS232')

{{% /div %}}
{{% div class="fragment current-visible" %}}

![HDD](/cards/hdd.png 'HDD')

{{% /div %}}
{{% /div %}}

---

## Expansion Bus

{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{49-57}
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

	NABUPC_OPTION_BUS(config, m_bus, 10.738635_MHz_XTAL / 3);
	m_bus->out_int_callback<0>().set(FUNC(nabupc_state::int_w<3>)).invert();
	m_bus->out_int_callback<1>().set(FUNC(nabupc_state::int_w<2>)).invert();
	m_bus->out_int_callback<2>().set(FUNC(nabupc_state::int_w<1>)).invert();
	m_bus->out_int_callback<3>().set(FUNC(nabupc_state::int_w<0>)).invert();
	NABUPC_OPTION_BUS_SLOT(config, "option1", m_bus, 0, option_bus_devices, nullptr);
	NABUPC_OPTION_BUS_SLOT(config, "option2", m_bus, 1, option_bus_devices, nullptr);
	NABUPC_OPTION_BUS_SLOT(config, "option3", m_bus, 2, option_bus_devices, nullptr);
	NABUPC_OPTION_BUS_SLOT(config, "option4", m_bus, 3, option_bus_devices, nullptr);
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{10-17}
void nabupc_state::io_map(address_map &map)
{
	map(0x00, 0x00).w(FUNC(nabupc_state::control_w));
	map(0x40, 0x40).r(m_ay8910, FUNC(ay8910_device::data_r));
	map(0x40, 0x41).w(m_ay8910, FUNC(ay8910_device::data_address_w));
	map(0x80, 0x80).rw(m_hccauart, FUNC(ay31015_device::receive), FUNC(ay31015_device::transmit));
	map(0x90, 0x91).rw(m_kbduart, FUNC(i8251_device::read), FUNC(i8251_device::write));
	map(0xa0, 0xa1).rw(m_tms9918a, FUNC(tms9918a_device::read), FUNC(tms9918a_device::write));
	map(0xb0, 0xb0).w("prndata", FUNC(output_latch_device::write));
	map(0xc0, 0xcf).rw(m_bus, FUNC(bus::nabupc::option_bus_device::read<0>),
	                          FUNC(bus::nabupc::option_bus_device::write<0>));
	map(0xd0, 0xdf).rw(m_bus, FUNC(bus::nabupc::option_bus_device::read<1>),
	                          FUNC(bus::nabupc::option_bus_device::write<1>));
	map(0xe0, 0xef).rw(m_bus, FUNC(bus::nabupc::option_bus_device::read<2>),
	                          FUNC(bus::nabupc::option_bus_device::write<2>));
	map(0xf0, 0xff).rw(m_bus, FUNC(bus::nabupc::option_bus_device::read<3>),
	                          FUNC(bus::nabupc::option_bus_device::write<3>));
}
```

{{< /div >}}
{{% /div %}}

---

## Expansion cards

|  Card Function  |     ID Value     |
|-----------------|------------------|
|     Floppy      |      0x10        |
|     RS232       |      0x08        |
|   Hard Drive    |      0xE8        |

---

## Floppy Drives

{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{}
void fdc_device::device_add_mconfig(machine_config &config)
{
	FD1797(config, m_fd1797, 4_MHz_XTAL / 4);
	FLOPPY_CONNECTOR(config, m_floppies[0], nabu_fdc_drives, "525dd",
	                 floppy_image_device::default_mfm_floppy_formats);
	FLOPPY_CONNECTOR(config, m_floppies[1], nabu_fdc_drives, "525dd",
	                 floppy_image_device::default_mfm_floppy_formats);
}

static void nabu_fdc_drives(device_slot_interface &device)
{
	device.option_add("525dd", FLOPPY_525_DD);
}

```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{}
uint8_t fdc_device::read(offs_t offset)
{
	uint8_t result;
	switch(offset) {
	case 0x00:
	case 0x01:
	case 0x02:
	case 0x03:
		result = m_fd1797->read(offset);
		break;
	case 0x0F:
		result = 0x10;
		break;
	default:
		result = 0xFF;
	}
	return result;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void fdc_device::write(offs_t offset, uint8_t data)
{
	switch(offset) {
	case 0x00:
	case 0x01:
	case 0x02:
	case 0x03:
		m_fd1797->write(offset, data);
		break;
	case 0x0F:
		ds_w(data);
		break;
	}
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void fdc_device::ds_w(uint8_t data)
{
	floppy_image_device *floppy = nullptr;

	if (BIT(data, 1)) floppy = m_floppies[0]->get_device();
	if (BIT(data, 2)) floppy = m_floppies[1]->get_device();

	m_fd1797->set_floppy(floppy);

	for (auto& fdd : m_floppies)
	{
		floppy_image_device *floppy = fdd->get_device();
		if (floppy)
		{
			floppy->mon_w((data & 6) ? 0 : 1);
		}
	}
}
```

{{< /div >}}
{{% /div %}}

---

## Floppy Media

{{% div class="r-stack smaller" %}}

| Media | Header                       | Volume ID | Type | Disk Parameter Block  (DPB)        |
|-------|------------------------------|-----------|------|------------------------------------|
| SSDS  | A1A14E4E4E4E4E4E4E4E4E4E4E4E | 0E0D2F00  |  00  | 2800030700C2005F00E000001801000307 |
| DSDS  | A1A14E4E4E4E4E4E4E4E4E4E4E4E | 0E0D2F00  |  01  | 2800040F01C400BF00E000003001000307 |
| DSQD  | A1A14E4E4E4E4E4E4E4E4E4E4E4E | 0E0D2F00  |  02  | 2800040F008C017F01FC00006101000307 |

{{% /div %}}

---

## RS232 Controller
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{}
void rs232_device::device_add_mconfig(machine_config &config)
{
	I8251(config, m_i8251, DERIVED_CLOCK(1, 2));
	m_i8251->rxrdy_handler().set(FUNC(rs232_device::rxrdy_w));
	m_i8251->txd_handler().set("rs232", FUNC(rs232_port_device::write_txd));

	PIT8253(config, m_pit8253, DERIVED_CLOCK(1, 2));
	m_pit8253->set_clk<0>(clock() / 2);
	m_pit8253->out_handler<0>().set(m_i8251, FUNC(i8251_device::write_txc));
	m_pit8253->set_clk<1>(clock() / 2);
	m_pit8253->out_handler<1>().set(m_i8251, FUNC(i8251_device::write_rxc));

	rs232_port_device &rs232(RS232_PORT(config, "rs232", default_rs232_devices, nullptr));
	rs232.rxd_handler().set(m_i8251, FUNC(i8251_device::write_rxd));
	rs232.cts_handler().set(m_i8251, FUNC(i8251_device::write_cts));
}

WRITE_LINE_MEMBER(rs232_device::rxrdy_w)
{
	get_slot()->int_w(!state);
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{}
uint8_t rs232_device::read(offs_t offset)
{
	uint8_t result = 0xff;

	switch (offset) {
	case 0x00:
	case 0x01:
		result = m_i8251->read(offset);
		break;
	case 0x04:
	case 0x05:
	case 0x07:
		result = m_pit8253->read(offset & 3);
		break;
	case 0x0f:
		result = 0x08;
	}
	return result;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void rs232_device::write(offs_t offset, uint8_t data)
{
	switch (offset) {
	case 0x00:
	case 0x01:
		m_i8251->write(offset, data);
		break;
	case 0x04:
	case 0x05:
	case 0x07:
		m_pit8253->write(offset & 3, data);
		break;
	}
}
```

{{< /div >}}
{{% /div %}}

---

## Hard Drive Controller
{{% div class="r-stack" %}}
{{< div class="fragment fade-out" index="0" >}}

```cpp{}
void hdd_device::device_add_mconfig(machine_config &config)
{
	WD1000(config, m_hdd, 0);

	HARDDISK(config, "hdd:0", 0);
}
```

{{< /div >}}
{{< div class="fragment current-visible" index="0" >}}

```cpp{}
uint8_t hdd_device::read(offs_t offset)
{
	uint8_t result = 0xff;

	switch(offset) {
	case 0x00:
	case 0x01:
	case 0x02:
	case 0x03:
	case 0x04:
	case 0x05:
	case 0x06:
	case 0x07:
		result = m_hdd->read(offset);
		break;
	case 0x0f:
		result = 0xe8;
		break;
	}
	return result;
}
```

{{< /div >}}
{{< div class="fragment current-visible" >}}

```cpp{}
void hdd_device::write(offs_t offset, uint8_t data)
{
	switch(offset) {
	case 0x00:
	case 0x01:
	case 0x02:
	case 0x03:
	case 0x04:
	case 0x05:
	case 0x06:
	case 0x07:
		m_hdd->write(offset, data);
		break;
	}
}
```

{{< /div >}}
{{% /div %}}
