import React from "react"
import { Table, Button, Loading } from "web3uikit"
import { Link } from "react-router-dom"

export const RestaurantsTable = ({
    data,
    columnsConfig,
    header,
    showStatus,
    onToggleStatus,
    loadingState,
    setButtonLoading,
}) => {
    return (
        <Table
            columnsConfig={columnsConfig}
            data={data.map((restaurant) => [
                <Link
                    className="text-green-600 hover:text-blue-500 cursor-pointer rounded-sm"
                    key={parseInt(restaurant.id, 16)}
                    to={`/restaurants/${parseInt(restaurant.id, 16)}`}
                >
                    {restaurant.name}
                </Link>,
                <div>{restaurant.businessAddress}</div>,
                ...(showStatus
                    ? [
                          <div>{restaurant.isActive ? "Active" : "Inactive"}</div>,
                          <Button
                              onClick={() => {
                                  setButtonLoading((prevButtonLoading) => ({
                                      ...prevButtonLoading,
                                      [parseInt(restaurant.id, 16)]: true,
                                  }))
                                  onToggleStatus(restaurant, parseInt(restaurant.id, 16))
                              }}
                              theme="primary"
                              text={
                                  loadingState[parseInt(restaurant.id, 16)] ? (
                                      <Loading
                                          size={20}
                                          spinnerColor="#ffffff"
                                          spinnerType="wave"
                                      />
                                  ) : restaurant.isActive ? (
                                      "Deactivate"
                                  ) : (
                                      "Activate"
                                  )
                              }
                          />,
                      ]
                    : []),
            ])}
            header={header}
            isColumnSortable={[true, false, false]}
            maxPages={10}
            onPageNumberChanged={function noRefCheck() {}}
            onRowClick={function noRefCheck() {}}
            pageSize={5}
        />
    )
}
