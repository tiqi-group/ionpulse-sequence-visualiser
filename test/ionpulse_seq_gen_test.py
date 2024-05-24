#!/usr/bin/python3

from ionpulse_sequence_generator import (
    Header,
    ChannelMask,
    ChannelIndex,
    LinearSequence,
    RFEdge,
    RFWait,
    TtlEdge,
    Loop,
    Time,
    Fork,
    Path,
    get_blocking_sequence,
    clear_all,
    RFPulse,
    Sequence,
    PopPMTFIFO,
    Discriminator,
    DiscriminatorType,
    ReadoutPostprocessingMethod,
    PIDParameter,
    SlopeTime,
)
from typing import List, Dict, Any

min_time = 1.3

def channel_map_to_rf_mask(channel_map: Dict[Any, int], keys: List[str]) -> int:
    rf_channel_mask = 0
    for key in keys:
        if key in channel_map:
            rf_channel_mask = rf_channel_mask | (1 << channel_map[key])

    return rf_channel_mask


def pi_2(name_suf: str, channel_map: Dict[str, Any], unit_idx: int) -> LinearSequence:
    add_ttl = "ttl" in channel_map and bool(channel_map["ttl"])
    _seq = LinearSequence(
        "pi/2 " + name_suf,
        ChannelMask(rf=channel_map_to_rf_mask(channel_map["729"][unit_idx], ["DP", "SP1", "SP2"]), digital_io=add_ttl),
        auto_channel_mask=False,
    )

    _seq += RFEdge.fromvalues("pi/2 DP on", channel_map["729"][unit_idx]["DP"], 120, 0, 30, 2)
    _seq += RFEdge.fromvalues("pi/2 DP off", channel_map["729"][unit_idx]["DP"], 120, 0, 0, 6)
    _seq += RFWait.fromvalues("pi/2 DP wait", channel_map["729"][unit_idx]["DP"], 2)

    if "SP1" in channel_map["729"][unit_idx]:
        _seq += RFEdge.fromvalues("sp car on", channel_map["729"][unit_idx]["SP1"], 80, 0, 100, 2)
        _seq += RFWait.fromvalues("sp wait", channel_map["729"][unit_idx]["SP1"], 8)

    if "SP2" in channel_map["729"][unit_idx]:
        _seq += RFWait.fromvalues("sp wait", channel_map["729"][unit_idx]["SP2"], 10)

    if add_ttl:
        _seq += TtlEdge("pi/2 ttl on", 2, 0x31020000)
        _seq += TtlEdge("pi/2 ttl off", 8, 0x00000000)

    _seq.sync()
    return _seq


def ms_1_2(name: str, channel_map: Dict[str, Any], unit_indices: List[int]) -> LinearSequence:
    _seq = LinearSequence("ms " + name, auto_channel_mask=True)
    for unit_idx in unit_indices:
        _seq += RFEdge.fromvalues(
            "ms " + name + " DP on", channel_map["729"][unit_idx]["DP"], 120, 0, 80, 4, flags=2
        )
        _seq += RFEdge.fromvalues(
            "ms " + name + " DP off", channel_map["729"][unit_idx]["DP"], 120, 0, 0, 92, flags=2
        )
        _seq += RFWait.fromvalues("ms " + name + " DP wait", channel_map["729"][unit_idx]["DP"], 4)

        if "SP1" in channel_map["729"][unit_idx]:
            _seq += RFEdge.fromvalues("sp bsb on", channel_map["729"][unit_idx]["SP1"], 81, 0, 100, 2)
            _seq += RFEdge.fromvalues("sp car ms", channel_map["729"][unit_idx]["SP1"], 80, 0, 100, 98)

        if "SP2" in channel_map["729"][unit_idx]:
            _seq += RFEdge.fromvalues("sp rsb on", channel_map["729"][unit_idx]["SP2"], 79, 0, 100, 2)
            _seq += RFEdge.fromvalues("sp off ms", channel_map["729"][unit_idx]["SP2"], 80, 0, 0, 98)

    _seq += TtlEdge("ms ttl on", 4, 0xE5120000)
    _seq += TtlEdge("ms ttl off", 92, 0x00000000)
    _seq += TtlEdge("ms ttl off2", 4, 0x00000000)

    _seq.sync()

    return _seq


def state_init(name: str, channel_map: Dict[str, int], n_qubits: int = 3) -> LinearSequence:
    rf_ch_mask = channel_map_to_rf_mask(channel_map, ["397", "854", "866"])
    _seq = LinearSequence(
        "state_init " + name,
        ChannelMask(rf=rf_ch_mask, digital_io=True, qubit=(1 << n_qubits) - 1),
        auto_channel_mask=False,
    )
    time = 8

    _seq += RFEdge.fromvalues("397 sig on", channel_map["397"], 200, 0, 100, min_time)
    _seq += RFEdge.fromvalues("state init 397 sig off", channel_map["397"], 200, 0, 0, time)
    # _seq += RFEdge.fromvalues("pi/2 DP on", channel_map["DP"], 120, 0, 30, 2)

    _seq += RFEdge.fromvalues("866 on", channel_map["866"], 200, 0, 100, min_time)
    _seq += RFEdge.fromvalues("state init 866 off", channel_map["866"], 200, 0, 0, time)

    _seq += RFEdge.fromvalues("854 on", channel_map["854"], 200, 0, 100, min_time)
    _seq += RFEdge.fromvalues("state init 854 off", channel_map["854"], 200, 0, 0, time)

    _seq += TtlEdge("TTL init", min_time, 0x12170000)
    _seq += TtlEdge("TTL init off", time, 0x00000000)

    # for idx in range(n_qubits):
    #    _seq += QubitEdge.fromvalues("init bare", idx, 33, 0, 2)

    _seq.sync()

    return _seq


def readout(name: str, channel_map: Dict[str, int], readout_channel_offset=0) -> LinearSequence:
    rf_ch_mask = channel_map_to_rf_mask(channel_map, ["397", "854", "866"])
    _seq = LinearSequence(
        "detection " + name,
        ChannelMask(rf=rf_ch_mask, digital_io=True, readout=True),
        auto_channel_mask=False,
    )

    _seq += RFEdge.fromvalues("397 sig on", channel_map["397"], 200, 0, 100, 2)
    _seq += RFEdge.fromvalues("detect 397 sig off", channel_map["397"], 200, 0, 0, 98)

    _seq += RFEdge.fromvalues("866 on", channel_map["397"], 200, 0, 100, 2)
    _seq += RFEdge.fromvalues("detect 866 off", channel_map["397"], 200, 0, 0, 98)

    _seq += TtlEdge("TTL detect", 2, 0xDE7EC700, pmts=0x1)
    _seq += TtlEdge("TTL detect off", 98, 0x00000000)

    # signal
    _seq += PopPMTFIFO("Signal " + name, 0, 0)
    _seq.sync()

    # background
    _seq += TtlEdge("TTL detect", 2, 0xDE7EC700, pmts=0x1)
    _seq += TtlEdge("TTL detect off", 98, 0x00000000)
    _seq += PopPMTFIFO("Background " + name, 0, 1)
    # background corrected and non corrected signal
    _seq += Discriminator(
        "Raw " + name,
        DiscriminatorType.RAW,
        0 + 2 * readout_channel_offset,
        {"shot_channel": 0},
    )
    _seq += Discriminator(
        "Correction " + name,
        DiscriminatorType.CORRECT_BACKGROUND,
        1 + 2 * readout_channel_offset,
        {"signal_channel": 0, "background_channel": 1},
    )
    _seq.sync()

    return _seq


def sbc(
        name: str, channel_map: Dict[str, Any], unit_idx: int, state_init: LinearSequence, n_loops: int = 10
) -> Loop:
    name_prefix = "sbc rsb "

    rf_ch_mask = channel_map_to_rf_mask(channel_map["729"][unit_idx], ["DP", "SP1", "SP2"])
    rsb_channel = ChannelMask(rf=rf_ch_mask)
    rsb_time = Time(
        name_prefix + "time", rsb_channel, [4 + k * 2 for k in range(n_loops)]
    )

    use_sp_aoms = "SP1" in channel_map["729"][unit_idx]

    _seq = Loop(
        "sbc " + name,
        n_loops,
        ChannelMask(
            rf=rf_ch_mask | state_init._ch_mask.rf,
            digital_io=True,
            qubit=0x7,
        ),
        auto_channel_mask=False,
    )
    _seq += state_init
    _seq.sync()
    _seq += RFEdge.fromvalues(name_prefix + "DP on", channel_map["729"][unit_idx]["DP"], 250, 0, 100, min_time*(1+use_sp_aoms), SlopeTime.SLOW.value)
    _seq += RFEdge.fromvalues(name_prefix + "DP off", channel_map["729"][unit_idx]["DP"], 250, 0, 0, rsb_time, SlopeTime.SLOW.value)
    _seq += RFWait.fromvalues(name_prefix + "DP wait", channel_map["729"][unit_idx]["DP"], 4 if use_sp_aoms else 1.3)
    # _seq += QubitEdge.fromvalues(name_prefix + "pad", channel_map["729"][unit_idx]["DP"] // 3, 30, 0, 4)
    # _seq += QubitEdge.fromvalues(
    #    name_prefix + "rsb", channel_map["729"][unit_idx]["DP"] // 3, 33, 0, rsb_time._value
    # )
    # _seq += QubitWait.fromvalues(name_prefix + "end", channel_map["729"][unit_idx]["DP"] // 3, 4)

    if use_sp_aoms:
        _seq += RFEdge.fromvalues(
            name_prefix + "sp car on", channel_map["729"][unit_idx]["SP1"], 79, 0, 100, min_time
        )
        _seq += RFWait.fromvalues(name_prefix + "sp wait 1", channel_map["729"][unit_idx]["SP1"], rsb_time)
        _seq += RFPulse.fromvalues("pulse", channel_map["729"][unit_idx]["SP1"], 80, 0, 0, min_time)
        # _seq += RFWait.fromvalues(name_prefix+"sp wait 2", channel_map["729"][unit_idx]["SP1"], 70)

    # if "SP2" in channel_map["729"][unit_idx]:
        # _seq += RFWait.fromvalues(name_prefix+"sp wait 1", channel_map["729"][unit_idx]["SP2"], 80)
        # _seq += RFWait.fromvalues(name_prefix+"sp wait 2", channel_map["729"][unit_idx]["SP2"], rsb_time)

    _seq.sync()

    return _seq

if __name__ == "__main__":
    channel_map = {
            "397": 6,
            "866": 7,
            "854": 8,
            "729": [
                {"DP": 0},
                {"DP": 3}
            ]
            }

    if True:
        channel_map["729"][0]["SP1"] = 1
        channel_map["729"][0]["SP2"] = 2
        channel_map["729"][1]["SP1"] = 4
        channel_map["729"][1]["SP2"] = 5

    state_prep = state_init("", channel_map)
    sbc_loop = sbc("0", channel_map, 0, state_prep)
    pi_2_unit_1 = pi_2("unit 1", channel_map | {"ttl": True}, 0)
    pi_2_unit_2 = pi_2("unit 2", channel_map, 1)
    ms12 = ms_1_2("1 2", channel_map, [0, 1])
    fork_readout_seq = readout("0", channel_map, 1)
    final_readout_seq = readout("final readout sequence", channel_map, 0)

    test_int = LinearSequence("", auto_channel_mask=True)
    test_int += RFEdge.fromvalues("test_int 397 sig on", channel_map["397"], 200, 0, 70, 2)
    test_int += RFEdge.fromvalues("test_int 397 sig off", channel_map["397"], 200, 0, 0, 48)
    test_int += RFEdge.fromvalues("test_int 866 on", channel_map["866"], 200, 0, 70, 2)
    test_int += RFEdge.fromvalues("test_int 866 off", channel_map["866"], 200, 0, 0, 48)
    test_int += RFEdge.fromvalues(
        "test_int 729 PID on", channel_map["729"][0]["DP"], 200, 0, 70, 2
    ).set_pid_reference(pid_ch=1, adc_ch=0, ref_v=150)
    test_int += RFEdge.fromvalues(
        "test_int 729 PID off", channel_map["729"][0]["DP"], 200, 0, 0, 48
    ).set_pid_reference(pid_ch=1, adc_ch=0, ref_v=150)
    test_int += RFEdge.fromvalues(
        "test_int 854 shaped on", channel_map["854"], 200, 0, 70, 2, slope_time=SlopeTime.FAST.value
    )
    test_int += RFEdge.fromvalues(
        "test_int 854 shaped off", channel_map["854"], 200, 0, 0, 48, slope_time=SlopeTime.SLOW.value
    )
    test_int += RFEdge.fromvalues(
        "test_int 854 slow on", channel_map["854"], 200, 0, 70, 2, slope_time=100
    )
    test_int += RFEdge.fromvalues(
        "test_int 854 slow off", channel_map["854"], 200, 0, 0, 48, slope_time=100
    )
    test_int.sync()

    all_channels = (1 << 16) - 1

    _seq = LinearSequence(
        "main",
        ChannelMask(rf=all_channels, digital_io=True, readout=True, qubit=0x7),
        auto_channel_mask=False,
    )

    _seq += sbc_loop
    _seq += state_prep
    _seq.sync()
    _seq += test_int
    _seq.add_global_wait(10)
    _seq += pi_2_unit_1
    _seq += pi_2_unit_2
    _seq += ms12
    _seq += pi_2_unit_1
    _seq += pi_2_unit_2
    # Insert shelving
    _seq.sync()
    _seq += fork_readout_seq
    _seq.sync()
    _seq += get_blocking_sequence(ChannelMask(rf=all_channels, digital_io=True))
    conditional_correction = Fork(
        "Correction",
        [{"readout_channel": 1, "state": 0x1}],
        ChannelMask(rf=all_channels, digital_io=True, readout=True),
    )
    path0 = Path(
        "path 0",
        ChannelMask(rf=all_channels, digital_io=True, readout=True),
        auto_channel_mask=False,
    )
    path0 += pi_2_unit_1
    path0.sync()
    path0 += RFWait.fromvalues("wait", ChannelMask(rf=0x1), 10)
    path0.sync()
    # Default path first
    conditional_correction += Path(
        "",
        ChannelMask(rf=all_channels, digital_io=True, readout=True),
        auto_channel_mask=False,
    )
    conditional_correction += path0
    conditional_correction.sync()
    _seq += conditional_correction
    _seq += final_readout_seq
    _seq.sync()

    header = Header()
    header.add_field(
        name="sequence_description",
        value="Test Sequence for Ionpulse Sequence Generator",
    )
    header.add_field(
            name="channel_map",
            value= channel_map
            )
    header.shot_channel_names = ["Signal", "Background"]
    header.shot_channel_plot_index = [0, 0]
    header.readout_channel_names = [
        "Raw",
        "Background Corrected",
        "Fork - Raw",
        "Fork - Background Corrected",
    ]
    header.readout_postprocessing_method = [
        ReadoutPostprocessingMethod.SUM,
        ReadoutPostprocessingMethod.AVERAGE,
        ReadoutPostprocessingMethod.NONE,
        ReadoutPostprocessingMethod.NONE,
    ]
    header.readout_channel_plot_index = [0, 1, -1, -1]
    PIDParameter(
        "PID RF CH 0",
        ChannelIndex.RF(0),
        0x3,
        1000,
        100,
        0,
        16000,
        50,
        50,
        16000,
        False,
    )
    # set the debug level to print everything for debugging
    header.debug_level = 0

    _seq.save_to_json_file("ionpulse_seq.json", header)
    # _seq.save_to_msgpack_file("ionpulse_seq.pack")
    # clear_all()
