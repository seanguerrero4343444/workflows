import React, { useState, useCallback, useEffect } from "react"
import { Modal, Input, DatePicker, Dropdown, useNotification, Loading } from "web3uikit"
import moment from "moment-timezone"
import { useMoralis, useWeb3Contract } from "react-moralis"
import { RestaurantManager, networkMapping } from "../constants"
import { generateTimeOptions } from "@/utils/dateUtils"

export const DropModal = ({ isVisible, onClose, restaurantId, refetchDrops }) => {
    const reservationOptions = [
        { id: "900", label: "15 min" }, // 15 * 60
        { id: "1800", label: "30 min" }, // 30 * 60
        { id: "3600", label: "1 hr" }, // 60 * 60
        { id: "7200", label: "2 hr" }, // 120 * 60
        { id: "14400", label: "4 hr" }, // 240 * 60
    ]

    // State

    const [mintPrice, setMintPrice] = useState(0)
    const [uiMintPrice, setUIMintPrice] = useState(0)
    const [startDate, setStartDate] = useState(moment.utc(new Date()).unix())
    const [endDate, setEndDate] = useState(moment.utc(new Date()).unix())
    const [dailyStartTime, setDailyStartTime] = useState(null)
    const [dailyEndTime, setDailyEndTime] = useState(null)
    const [windowDuration, setWindowDuration] = useState(parseInt(reservationOptions[0].id))
    const [reservationsPerWindow, setReservationsPerWindow] = useState("5")
    const [buttonLoading, setButtonLoading] = useState(false)
    const [startTimeOptions, setStartTimeOptions] = useState([])
    const [endTimeOptions, setEndTimeOptions] = useState([])

    const { Moralis, chainId: chainIdHex } = useMoralis()
    const chainId = parseInt(chainIdHex)
    const rmAddress =
        chainId in networkMapping ? networkMapping[chainId]["RestaurantManager"] : null
    const dispatch = useNotification()

    useEffect(() => {
        handleWindowDurationChange(reservationOptions[0])
    }, [])

    // Contract functions

    const {
        runContractFunction: createDrop,
        data: enterTxResponse,
        isLoading,
        isFetching,
    } = useWeb3Contract({
        abi: RestaurantManager,
        contractAddress: rmAddress,
        functionName: "createDrop",
        params: {
            restaurantId: restaurantId,
            mintPrice: mintPrice,
            startDate: startDate,
            endDate: endDate,
            dailyStartTime: dailyStartTime,
            dailyEndTime: dailyEndTime,
            windowDuration: windowDuration,
            reservationsPerWindow: reservationsPerWindow,
        },
    })

    // Handlers

    const handleNewNotification = (type, message, title, tx) => {
        dispatch({
            type: type,
            message: message,
            title: title,
            position: "topR",
        })
    }

    const handleSuccess = useCallback(
        async (tx) => {
            try {
                await tx.wait(1)
                handleNewNotification(
                    "success",
                    "Transaction Complete!",
                    "Transaction Notification",
                    tx
                )

                setMintPrice(0)
                setStartDate(new Date())
                setEndDate(new Date())
                setDailyStartTime(null)
                setDailyEndTime(null)
                setWindowDuration(parseInt(reservationOptions[0].id))
                setReservationsPerWindow("")
                refetchDrops()
                setButtonLoading(false)
                onClose()
            } catch (error) {
                console.log(error)
            }
        },
        [handleNewNotification]
    )

    const handleError = useCallback(
        (error) => {
            handleNewNotification("error", error.message, "Transaction Notification")
            setButtonLoading(false)
        },
        [handleNewNotification]
    )

    const handleSubmit = useCallback(
        async (data) => {
            data = {
                mintPrice: mintPrice,
                startDate: startDate,
                endDate: endDate,
                dailyStartTime,
                dailyEndTime,
                windowDuration,
                reservationsPerWindow,
            }
            setButtonLoading(true)

            await createDrop({
                onSuccess: (tx) => {
                    handleSuccess(tx)
                },
                onError: (error) => {
                    handleError(error)
                },
            })
        },
        [
            createDrop,
            handleSuccess,
            handleError,
            mintPrice,
            startDate,
            endDate,
            dailyStartTime,
            dailyEndTime,
            windowDuration,
            reservationsPerWindow,
        ]
    )

    const handleTimeChange = (selectedOption, isStartTime) => {
        const selectedTimeInSeconds = parseInt(selectedOption.id)
        if (isStartTime) {
            setDailyStartTime(selectedTimeInSeconds)
            setStartDate(
                moment
                    .utc(startDate * 1000)
                    .startOf("day")
                    .add(selectedTimeInSeconds, "seconds")
                    .unix()
            )
            const endTimeOptions = generateTimeOptions(windowDuration).filter(
                (option) => parseInt(option.id) > selectedTimeInSeconds
            )
            setEndTimeOptions(endTimeOptions)
        } else {
            setDailyEndTime(selectedTimeInSeconds)
            setEndDate(
                moment
                    .utc(endDate * 1000)
                    .startOf("day")
                    .add(selectedTimeInSeconds, "seconds")
                    .unix()
            )
            const startTimeOptions = generateTimeOptions(windowDuration).filter(
                (option) => parseInt(option.id) < selectedTimeInSeconds
            )
            setStartTimeOptions(startTimeOptions)
        }
    }

    const handleWindowDurationChange = (selectedOption) => {
        const increment = parseInt(selectedOption.id)
        setWindowDuration(increment)
        setStartTimeOptions(generateTimeOptions(increment).slice(0, -1))
        setEndTimeOptions(generateTimeOptions(increment).slice(1))
    }

    const handleMintPriceChange = (mintPrice) => {
        if (mintPrice === "" || isNaN(mintPrice)) {
            setMintPrice(0)
            setUIMintPrice("")
        } else {
            setMintPrice(Moralis.Units.ETH(mintPrice))
            setUIMintPrice(mintPrice)
        }
    }

    // Render

    return (
        <Modal
            isVisible={isVisible}
            canOverflow={true}
            onCloseButtonPressed={onClose}
            onOk={handleSubmit}
            okText={
                buttonLoading ? (
                    <Loading size={20} spinnerColor="#ffffff" spinnerType="wave" />
                ) : (
                    "Create Drop"
                )
            }
            onCancel={onClose}
            cancelText="Cancel"
            className="bg-white rounded-lg p-6"
        >
            <div
                className="max-h-screen overflow-auto p-6"
                style={{
                    marginBottom: "20px",
                }}
            >
                <div className="text-xl font-bold mb-4">Create a Drop</div>

                <form>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-gray-700 font-medium">
                                Mint Price (MATIC)
                            </label>
                            <Input
                                className="mt-1 w-full border rounded-md p-2"
                                value={uiMintPrice}
                                onChange={(e) => handleMintPriceChange(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">
                                Drop Start Date
                            </label>
                            <DatePicker
                                className="mt-1 w-full"
                                selectedDate={startDate}
                                onChange={(date) =>
                                    setStartDate(
                                        moment
                                            .utc(date.date)
                                            .startOf("day")
                                            .add(dailyStartTime, "seconds")
                                            .unix()
                                    )
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">
                                Drop End Date
                            </label>
                            <DatePicker
                                className="mt-1 w-full"
                                selectedDate={endDate}
                                onChange={(date) =>
                                    setEndDate(
                                        moment
                                            .utc(date.date)
                                            .startOf("day")
                                            .add(dailyEndTime, "seconds")
                                            .unix()
                                    )
                                }
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 font-medium">
                                Reservation Window:
                            </label>
                            <Dropdown
                                className=""
                                onChange={handleWindowDurationChange}
                                options={reservationOptions}
                            />
                        </div>
                        <div className="">
                            <div className="z-10">
                                <label className="block text-gray-700 font-medium">
                                    Daily Start Time :
                                </label>
                                <Dropdown
                                    className="mt-1 w-full"
                                    onChange={(selectedOption) =>
                                        handleTimeChange(selectedOption, true)
                                    }
                                    options={startTimeOptions}
                                />
                            </div>
                            <div className="z-10">
                                <label className="block text-gray-700 font-medium">
                                    Daily End Time:
                                </label>
                                <Dropdown
                                    className="mt-1 w-full"
                                    onChange={(selectedOption) =>
                                        handleTimeChange(selectedOption, false)
                                    }
                                    options={endTimeOptions}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium">
                                Number of Reservations per Window
                            </label>
                            <Input
                                className="mt-1 w-full border rounded-md p-2 mb-4"
                                type="number"
                                value={reservationsPerWindow}
                                onChange={(e) => setReservationsPerWindow(e.target.value)}
                            />
                        </div>
                    </div>
                </form>
            </div>
        </Modal>
    )
}
