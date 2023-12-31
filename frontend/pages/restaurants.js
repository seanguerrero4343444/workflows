import styles from "@/styles/Home.module.css"
import React, { Suspense, lazy } from "react"
import { ChainCheck } from "@/components/ChainCheck"
import { useUpdateData } from "../contexts/UpdateDataContext"

const RegisterRestaurant = lazy(() => import("@/components/RegisterRestaurant"))
const ActiveRestaurants = lazy(() => import("@/components/ActiveRestaurants"))

export default function Restaurants() {
    const { updateKey, refreshData } = useUpdateData()

    return (
        <div className={`p-6 bg-white shadow-md rounded-lg ${styles.container}`}>
            <ChainCheck />
            <div className="flex flex-row justify-center">
                <div className="w-2/3">
                    <Suspense fallback={<div>Loading...</div>}>
                        <ActiveRestaurants updateKey={updateKey} />
                    </Suspense>
                </div>
                <div className="w-1/3 h-full">
                    <Suspense fallback={<div>Loading...</div>}>
                        <RegisterRestaurant
                            onDataChange={refreshData}
                            className="p-8 bg-gray-100 rounded-lg shadow-lg h-full"
                        />
                    </Suspense>
                </div>
            </div>
        </div>
    )
}
