#!/usr/bin/python3
from typing import Any, Dict, List, Tuple
from numpy.typing import NDArray
from numpy import array, log2, binary_repr
import json
import argparse

from ionpulse_sequence_generator import (
        Sequence,
        LinearSequence,
        ChannelMask,
        ChannelIndex
        )

from ionpulse_seq_gen_test import (
        state_init,
        sbc,
        pi_2,
        ms_1_2,
        readout
        )

import numpy as np
import matplotlib.pyplot as plt

# From experiment library
def generate_simplified_json(sequence):
    generated_dict = dict()
    for i in range(32):
        generated_dict[f"TTL{i}"] = {"values": [], "times": []}
    for pmt_idx in range(8):
        generated_dict[f"PMT{pmt_idx}"] = {"values": [], "times": []}
    for channel in sequence._ch_mask.to_idx_list():
        if channel.is_rf_channel():

            channel_sequence, _,_,_,_, names = sequence.get_event_params_per_channel(
                    channel)
            channel_sequence["time"] = list(array(channel_sequence["time"]).cumsum(dtype=float))

            #channel_sequence["names"] = names

            generated_dict[f"RF{int(log2(channel.rf))}"] = channel_sequence
        elif channel.is_digital_io():

            events = sequence.get_event_params_per_channel(channel)[0]

            for i in range(32):
                generated_dict[f"TTL{i}"] = {"values": []}
                for ttl_event in events["ttl_target"]:
                    generated_dict[f"TTL{i}"]["values"].append(int(binary_repr(ttl_event, 32)[::-1][i]))
                    generated_dict[f"TTL{i}"]["time"] = list(array(events["time"]).cumsum(dtype=float))

            for pmt_idx in range(8):
                generated_dict[f"PMT{pmt_idx}"] = {"values": []}
                for pmt_event in events["pmts"]:
                    generated_dict[f"PMT{pmt_idx}"]["values"].append(int(binary_repr(pmt_event, 8)[::-1][pmt_idx]))
                    generated_dict[f"PMT{pmt_idx}"]["time"] = list(array(events["time"]).cumsum(dtype=float))

    return generated_dict

def expand_to_waveform(rf_params: Dict) -> Tuple[NDArray[Any], NDArray[Any]] :
    # time is in units of us so sampling rate of 10 equal 10 MSPS
    sampling_rate = 10
    n_samples = 0
    for i in range(len(rf_params["time"])-1):
        if i == 0:
            a = 0
        else:
            a = rf_params["amp"][i-1]
        if a == 0:
            n_samples += 2
        else:
            segment_samples = int(np.ceil(rf_params["time"][i]*sampling_rate))
            n_samples += segment_samples

    time = np.zeros(n_samples)
    value = np.zeros_like(time)
    current_idx = 0
    for i in range(len(rf_params["time"])-1):
        duration = rf_params["time"][i]
        # Unfold waveforms
        if i == 0:
            f = 0
            p = 0
            a = 0
            t = 0
        else:
            f = rf_params["freq"][i-1]
            p = rf_params["phase"][i-1]
            a = rf_params["amp"][i-1]
            t = time[current_idx-1]

        if a == 0:
            # print(f"Expanding {0:6} amplitude from {t:10.3f} to {t+duration:10.3f}")
            time[current_idx] = t
            time[current_idx+1] = t+duration
            value[current_idx] = 0
            value[current_idx+1] = 0
            current_idx += 2
        else:
            segment_samples = int(np.ceil(duration*sampling_rate))
            # print(f"Expanding {segment_samples:8} samples from {t:10.3f} to {t+duration:10.3f},"
            #       f"f: {f:3.2f}, a: {a:3.2f}, p: {p:3.2f}")
            # Optionally use relative time
            segment_time = np.linspace(t, t+duration, segment_samples)
            time[current_idx:current_idx+segment_samples] = segment_time
            value[current_idx:current_idx+segment_samples] = a*np.cos(2*np.pi*(f*0.001*segment_time + p/360))
            current_idx += segment_samples

    return (time, value)


def plot_data_for_channel_sequence(
    sequence: Sequence, channelIdx: ChannelIndex, paths=[0], ylimit_extension=0.1,
    expand=False
) -> Tuple[NDArray[Any], Dict, List[Tuple], NDArray, Dict, Dict[Any, List[int|float]], Dict] :
    if (
        channelIdx.is_rf_channel()
        or channelIdx.is_qubit_idx()
        or channelIdx.is_digital_io()
    ):
        rf_params, _, _, forks, looptimes, names = sequence.get_event_params_per_channel(
            channelIdx
        )
        # TODO: Plotting of Forks will only give the given path for all forks for now
        _, forkstarts, forkends = sequence.unpack_fork_params_per_channel(
            rf_params, channelIdx, forks, paths * len(forks)
        )

        n_yticks = {
                "samples": 3,
                "freq": 3,
                "phase": 5,
                "amp": 3,
                "ttl_target": 2,
                "ttls_to_change": 2,
                "pmts": 2,
                "pmts_to_change": 2
                }

        values = dict()
        ylimits = dict()
        yticks = dict()
        if not expand or channelIdx.is_digital_io():
            # repeat params to get proper edges
            time = np.insert(np.array(rf_params["time"]), 0, 0).cumsum().repeat(2)
            for key in rf_params.keys():
                if key == "time":
                    continue

                if expand:
                    if key.find("to_change") >= 0:
                        continue

                    value = np.zeros(len(rf_params[key])*2+2, dtype=np.uint32)
                    for i, (pattern, to_change) in enumerate(zip(rf_params[key], rf_params[key[0:3]+"s_to_change"])):
                        value[2*i+2:2*i+4] = (value[2*i] & to_change) | pattern


                    n_channels = 1
                    if value.any():
                        n_channels = int(np.ceil(np.log2(max(value)+1)))

                    value_array = np.zeros((len(value), n_channels))
                    for i in range(n_channels):
                        value_array[:,i] = i+(value & (1 << i) != 0)
                    values[key] = value_array
                    ylimits[key] = [-ylimit_extension, n_channels+ylimit_extension]
                    yticks[key] = np.arange(0, n_channels)
                else:
                    value = np.insert(np.array(rf_params[key]), 0, 0).repeat(2)
                    values[key] = value
                    center = (max(value) - min(value)) / 2
                    ylimits[key] = [
                        center - abs(center) * (1 + 2 * ylimit_extension),
                        center + abs(center) * (1 + 2 * ylimit_extension)
                    ]
                    yticks[key] = np.linspace(min(value), max(value), n_yticks[key])

            time = time[1:]
            time = np.insert(time, -1, time[-1])
        else:
            if channelIdx.is_qubit_idx():
                raise NotImplementedError("Expanding qubit sequences is not supported")

            time, value = expand_to_waveform(rf_params)
            values["samples"] = value
            center = (max(value) + min(value)) / 2
            span = (max(value) - min(value))*(1+ylimit_extension)
            ylimits["samples"] = [
                center - span/2,
                center + span/2
            ]
            yticks["samples"] = np.linspace(min(value), max(value), n_yticks["samples"])

        return (
            time,
            values,
            list(zip(forkstarts, forkends)),
            np.array(looptimes).cumsum(),
            ylimits,
            yticks,
            names,
        )

    else:
        raise KeyError("Channels other than RF are not supported")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--jsononly", help="Only create the plot json and don't plot", action="store_true")
    parser.add_argument("--sbcloops", help="Number of SBC loops", default=5)
    args = parser.parse_args()

    state_prep = state_init("", 6)
    sbc_loop = sbc("0", 0, state_prep, n_loops=int(args.sbcloops))
    pi_2_unit_1 = pi_2("unit 1", 0, True)
    pi_2_unit_2 = pi_2("unit 2", 3)
    ms12 = ms_1_2("1 2", 0, 3)
    final_readout_seq = readout("final readout sequence", 6, 0)

    all_channels = (1 << 16) - 1
    _seq = LinearSequence(
        "main",
        ChannelMask(rf=all_channels, digital_io=True, readout=True, qubit=0x7),
        auto_channel_mask=False,
    )

    _seq += sbc_loop
    _seq += state_prep
    _seq.sync()
    _seq += pi_2_unit_1
    _seq += pi_2_unit_2
    _seq += ms12
    _seq += pi_2_unit_1
    _seq += pi_2_unit_2
    _seq.sync()
    _seq += final_readout_seq
    _seq.sync()

    with open("ionpulse_seq_plot.json", "w") as f:
        json.dump(generate_simplified_json(_seq), f)

    if args.jsononly:
        exit(0)

    # channel, value, path
    channelvalues = [
        (ChannelIndex.RF(0), 0),
        (ChannelIndex.Digital_IO(), 0),
    ]

    n_plots = len(channelvalues)
    fig = plt.figure(layout='constrained', figsize=(6,10))
    subfigs = fig.subfigures(n_plots, 1)
    if n_plots == 1:
        subfigs = [subfigs]

    xlims = [0, 0]
    all_axes = []
    for f in range(n_plots):
        channelvalue = channelvalues[f]
        (
            time,
            values,
            forks,
            loops,
            ylimits,
            yticks,
            names
        ) = plot_data_for_channel_sequence(
            _seq, channelvalue[0], paths=[channelvalue[1]], expand=False
        )
        subfig = subfigs[f]
        axs = subfig.subplots(len(values.keys()),1)
        if len(values.keys()) == 1:
            axs = [axs]
        all_axes.extend(axs)
        for p, key in enumerate(values.keys()):
            ax = axs[p]
            ax.plot(time, values[key])
            ax.set_ylim(ylimits[key])
            ax.set_yticks(yticks[key])
            ax.set_ylabel(f"{str(channelvalue[0])}\nPath {channelvalue[1]}\n{key}", labelpad=0, rotation=90)
            # calculate xlims to set for all subplots at the end
            if xlims[0] > time[0]:
                xlims[0] = time[0]
            if xlims[1] < time[-1]:
                xlims[1] = time[-1]
            # visible forks and loops
            for looptime in loops:
                ax.plot([looptime] * 4, ylimits[key] * 2, "b:", label="loop iteration")
            for fs, fe in forks:
                ax.plot([fs] * 4, ylimits[key] * 2, "g:", label="fork start")
                ax.plot([fe] * 4, ylimits[key] * 2, "r:", label="fork end")

            ax.tick_params(axis='x', color="w")
            ax.grid()

    # set xlims for all plots
    center = (xlims[1] - xlims[0]) / 2
    xlims = [center - abs(center) * (1.1), center + abs(center) * (1.1)]
    for ax in all_axes:
        ax.set_xlim(xlims)
    # xticks for the last plot
    all_axes[-1].set_xlabel("$t$ / $\mu$ s", color="k")
    # labels, but only keep unique ones
    handles, labels = all_axes[-1].get_legend_handles_labels()
    by_label = dict(zip(labels, handles))
    plt.legend(
        by_label.values(),
        by_label.keys(),
        loc="upper center",
        bbox_to_anchor=(0.5, -0.6),
        ncols=len(labels),
    )

    # set alignement and labels
    # fig.set_size_inches(8, 4)
    fig.align_ylabels(all_axes[:])
    # plt.tight_layout()
    # plt.subplots_adjust(hspace=0.1, wspace=0.2)
    # plt.savefig('plotting_example.pdf')
    plt.show()

    # clear_all()
