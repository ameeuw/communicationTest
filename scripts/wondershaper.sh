#!/bin/bash
# Wonder Shaper
#
# Set the following values to somewhat less than your actual download
# and uplink speed. In kilobits. Also set the device that is to be shaped.
#
# License GPLv2 <https://gnu.org/licenses/gpl-2.0.html>
#
# Copyright (c) 2002-2018 Bert Hubert <ahu@ds9a.nl>,
#         Jacco Geul <jacco@geul.net>, Simon Séhier <simon@sehier.fr>
#
# See the ChangeLog for information on the individual contributions of the authors.

QUANTUM=6000
BURST=15k
COMMONOPTIONS="$COMMONOPTIONS"
VERSION=1.4

usage()
{
cat << EOF
USAGE: $0 [-hcs] [-a <adapter>] [-d <rate>] [-u <rate>]
Limit the bandwidth of an adapter
OPTIONS:
   -h           Show this message
   -a <adapter> Set the adpter
   -d <rate>    Set maximum download rate (in Kbps) and/or
   -u <rate>    Set maximum upload rate (in Kbps)
   -p           Use presets in /etc/conf.d/wondershaper.conf
   -c           Clear the limits from adapter
   -s           Show the current status of adapter
   -v           Show the current version
MODES:
   wondershaper -a <adapter> -d <rate> -u <rate>
   wondershaper -c -a <adapter>
   wondershaper -s -a <adapter>
EXAMPLES:
   wondershaper -a eth0 -d 1024 -u 512
   wondershaper -a eth0 -u 512
   wondershaper -c -a eth0
EOF
}

DSPEED=
USPEED=
IFACE=
IFB="ifb0"
MODE=

while getopts hvd:u:a:pcs o
do	case "$o" in
	h)	usage
		exit 1;;
        v)      echo "Version $VERSION"
                exit 0;;
	d)	DSPEED=$OPTARG;;
	u)      USPEED=$OPTARG;;
	a)      IFACE=$OPTARG;;
	p)      MODE="presets";;
	c)      MODE="clear";;
	s)      MODE="status";;
	[?])	usage
		exit 1;;
	esac
done

if [ "$MODE" = "presets" ]
then
    if [ -f /etc/conf.d/wondershaper.conf ]
    then
	source /etc/conf.d/wondershaper.conf
    else
	echo "/etc/conf.d/wondershaper.conf not found"
	exit 1
    fi
fi

if [[ ! -z $MODE ]] && [[ -z $IFACE ]]
then
    echo "Please supply the adapter name for the mode."
    echo ""
    usage
    exit 1
fi

if [ "$MODE" = "status" ]
then
    tc -s qdisc ls dev $IFACE
    tc -s class ls dev $IFACE
    exit
fi

if [ "$MODE" = "clear" ]
then
    tc qdisc del dev $IFACE root    2> /dev/null > /dev/null
    tc qdisc del dev $IFACE ingress 2> /dev/null > /dev/null
    tc qdisc del dev $IFB   root    2> /dev/null > /dev/null
    tc qdisc del dev $IFB   ingress 2> /dev/null > /dev/null
    exit
fi

if ( [[ -z $DSPEED ]] && [[ -z $USPEED ]] ) || [[ -z $IFACE ]]
then
    usage
    exit 1
fi

# low priority OUTGOING traffic - you can leave this blank if you want
# low priority source netmasks
NOPRIOHOSTSRC=80

# low priority destination netmasks
NOPRIOHOSTDST=

# low priority source ports
NOPRIOPORTSRC=

# low priority destination ports
NOPRIOPORTDST=

###### uplink

# install root HTB

tc qdisc add dev $IFACE root handle 1: htb \
    default 20

# shape everything at $USPEED speed - this prevents huge queues in your
# DSL modem which destroy latency:
# main class
if [[ ! -z $USPEED ]]
then

    tc class add dev $IFACE parent 1: classid 1:1 htb \
        rate ${USPEED}kbit \
        prio 5 $COMMONOPTIONS

    # high prio class 1:10:

    tc class add dev $IFACE parent 1:1 classid 1:10 htb \
        rate $[40*$USPEED/100]kbit ceil $[95*$USPEED/100]kbit \
        prio 1 $COMMONOPTIONS

    # bulk and default class 1:20 - gets slightly less traffic,
    #  and a lower priority:

    tc class add dev $IFACE parent 1:1 classid 1:20 htb \
        rate $[40*$USPEED/100]kbit ceil $[95*$USPEED/100]kbit \
        prio 2 $COMMONOPTIONS

    # 'traffic we hate'

    tc class add dev $IFACE parent 1:1 classid 1:30 htb \
        rate $[20*$USPEED/100]kbit ceil $[90*$USPEED/100]kbit \
        prio 3 $COMMONOPTIONS

    # all get Stochastic Fairness:
    tc qdisc add dev $IFACE parent 1:10 handle 10: sfq perturb 10 quantum $QUANTUM
    tc qdisc add dev $IFACE parent 1:20 handle 20: sfq perturb 10 quantum $QUANTUM
    tc qdisc add dev $IFACE parent 1:30 handle 30: sfq perturb 10 quantum $QUANTUM

    # start filters
    # TOS Minimum Delay (ssh, NOT scp) in 1:10:
    tc filter add dev $IFACE parent 1: protocol ip prio 10 u32 \
        match ip tos 0x10 0xff  flowid 1:10

    # ICMP (ip protocol 1) in the interactive class 1:10 so we
    # can do measurements & impress our friends:
    tc filter add dev $IFACE parent 1: protocol ip prio 11 u32 \
        match ip protocol 1 0xff flowid 1:10

    # prioritize small packets (<64 bytes)

    tc filter add dev $IFACE parent 1: protocol ip prio 12 u32 \
        match ip protocol 6 0xff \
        match u8 0x05 0x0f at 0 \
        match u16 0x0000 0xffc0 at 2 \
        flowid 1:10


    # some traffic however suffers a worse fate
    for a in $NOPRIOPORTDST
    do
        tc filter add dev $IFACE parent 1: protocol ip prio 14 u32 \
            match ip dport $a 0xffff flowid 1:30
    done

    for a in $NOPRIOPORTSRC
    do
        tc filter add dev $IFACE parent 1: protocol ip prio 15 u32 \
            match ip sport $a 0xffff flowid 1:30
    done

    for a in $NOPRIOHOSTSRC
    do
        tc filter add dev $IFACE parent 1: protocol ip prio 16 u32 \
            match ip src $a flowid 1:30
    done

    for a in $NOPRIOHOSTDST
    do
        tc filter add dev $IFACE parent 1: protocol ip prio 17 u32 \
            match ip dst $a flowid 1:30
    done

    # rest is 'non-interactive' ie 'bulk' and ends up in 1:20

    tc filter add dev $IFACE parent 1: protocol ip prio 18 u32 \
        match ip dport 46659 0xffff flowid 1:20

    tc filter add dev $IFACE parent 1: protocol ip prio 18 u32 \
        match ip dport 46660 0xffff flowid 1:20

fi

########## downlink #############
# slow downloads down to somewhat less than the real speed  to prevent
# queuing at our ISP. Tune to see how high you can set it.
# ISPs tend to have *huge* queues to make sure big downloads are fast
#
# attach ingress policer:
if [[ ! -z $DSPEED ]]
then

    # Add the IFB interface
    modprobe ifb numifbs=1
    ip link set dev $IFB up

    # Redirect ingress (incoming) to egress ifb0
    tc qdisc add dev $IFACE handle ffff: ingress
    tc filter add dev $IFACE parent ffff: protocol ip u32 match u32 0 0 \
        action mirred egress redirect dev $IFB

    # Add class and rules for virtual
    tc qdisc add dev $IFB root handle 2: htb
    tc class add dev $IFB parent 2: classid 2:1 htb rate ${DSPEED}kbit

    # Add filter to rule for IP address
    tc filter add dev $IFB protocol ip parent 2: prio 1 u32 \
        match ip sport 46659 0xffff flowid 2:1

    tc filter add dev $IFB protocol ip parent 2: prio 1 u32 \
        match ip sport 46660 0xffff flowid 2:1
fi
