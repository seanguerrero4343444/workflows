// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/ReservNFT.sol";
import "../src/RestaurantManager.sol";

contract ReservNFTTest is Test {
    ReservNFT reservNFT;
    RestaurantManager restaurantManager;

    function setUp() public {
        restaurantManager = new RestaurantManager();
        reservNFT = new ReservNFT();

        // Set up the addresses after deploying both contracts

        restaurantManager.setReservNFTAddress(address(reservNFT));
        reservNFT.setRestaurantManagerAddress(address(restaurantManager));

        // Register a restaurant
        restaurantManager.registerRestaurant(
            "Test Restaurant",
            "123 Main St, New York, NY 10001"
        );
        uint64 startDate = 1700000000;
        uint64 endDate = 1700003600;
        uint32 dailyStartTime = 28800; // 8:00 am in seconds
        uint32 dailyEndTime = 79200; // 10:00 pm in seconds
        uint32 windowDuration = 3600; // hourly windows in seconds
        uint16 reservationsPerWindow = 10;

        restaurantManager.createDrop(
            0,
            0.01 ether,
            startDate,
            endDate,
            dailyStartTime,
            dailyEndTime,
            windowDuration,
            reservationsPerWindow
        );
    }

    fallback() external payable {}

    function _createReservNFT(
        uint256 dropId,
        uint256 reservationTimestamp,
        string memory tokenURI,
        uint256 value
    ) internal returns (uint256) {
        return
            reservNFT.createReservNFT{value: value}(
                dropId,
                reservationTimestamp,
                tokenURI
            );
    }

    function test_createReservNFT() public payable {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        uint256 tokenId = reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );

        ReservNFT.Reservation memory reservation = reservNFT
            .getReservationDetails(tokenId);

        assertEq(reservation.dropId, dropId);
        assertEq(reservation.restaurantId, 0);
        assertEq(reservation.reservationTimestamp, reservationTimestamp);
    }

    function testRevertWhen_createReservNFT_insufficientPayment() public {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        // Attempt to mint with insufficient payment
        vm.expectRevert(ReservNFT__InsufficientPayment.selector);
        reservNFT.createReservNFT{value: 0.005 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );
    }

    function testRevertWhen_createReservNFT_inactiveDrop() public {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        // Deactivate the drop
        restaurantManager.toggleDropIsActive(dropId);
        // Attempt to mint from an inactive drop
        vm.expectRevert(ReservNFT__InactiveDrop.selector);
        reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );
    }

    function testRevertWhen_createReservNFT_outsideDropWindow() public {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 170004000; // Outside the drop window
        // Attempt to mint outside the drop window
        vm.expectRevert(ReservNFT__OutsideDropWindow.selector);
        reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );
    }

    function test_RevertWhen_createReservNFT_MoreThanUniqueNFTsForWindow()
        public
        payable
    {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        // Mint 10 NFTs for the given window
        for (uint8 i = 0; i < 10; i++) {
            reservNFT.createReservNFT{value: 0.01 ether}(
                dropId,
                reservationTimestamp,
                "ipfs://test-uri"
            );
        }

        // Attempt to mint an 11th NFT for the same window
        vm.expectRevert(ReservNFT__ExceedReservationsLimit.selector);
        reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );
    }

    function test_getReservationDetails() public payable {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        uint256 tokenId = reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );

        // Retrieve reservation details
        ReservNFT.Reservation memory reservation = reservNFT
            .getReservationDetails(tokenId);

        // Verify reservation details
        assertEq(reservation.dropId, dropId);
        assertEq(reservation.restaurantId, 0);
        assertEq(reservation.reservationTimestamp, reservationTimestamp);
    }

    function test_createReservNFT_withOverpayment() public payable {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        uint256 initialBalance = address(this).balance;

        // Mint with overpayment
        uint256 tokenId = reservNFT.createReservNFT{value: 0.02 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );

        // Verify that the refund was received
        assertEq(address(this).balance, initialBalance - 0.01 ether); // Subtract the mint price from the initial balance

        // Retrieve reservation details
        ReservNFT.Reservation memory reservation = reservNFT
            .getReservationDetails(tokenId);

        // Verify reservation details
        assertEq(reservation.dropId, dropId);
        assertEq(reservation.restaurantId, 0);
        assertEq(reservation.reservationTimestamp, reservationTimestamp);
    }

    function test_tokenURI() public payable {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        string memory expectedTokenURI = "ipfs://test-uri";
        uint256 tokenId = reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            expectedTokenURI
        );

        // Retrieve tokenURI for the minted NFT
        string memory actualTokenURI = reservNFT.tokenURI(tokenId);

        // Verify tokenURI
        assertEq(actualTokenURI, expectedTokenURI);
    }

    function test_withdraw() public {
        uint256 dropId = 0;
        uint256 reservationTimestamp = 1700000001; // Within the drop window
        uint256 initialBalance = address(this).balance;
        reservNFT.createReservNFT{value: 0.01 ether}(
            dropId,
            reservationTimestamp,
            "ipfs://test-uri"
        );

        // Withdraw contract balance to the owner
        reservNFT.withdraw();

        // Verify that the contract balance is now zero
        assertEq(address(reservNFT).balance, 0);

        // Verify that the owner's balance has increased
        assertEq(address(this).balance, initialBalance);
    }
}