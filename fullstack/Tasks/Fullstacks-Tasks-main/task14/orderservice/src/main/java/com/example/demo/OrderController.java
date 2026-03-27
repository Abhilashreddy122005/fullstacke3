package com.example.demo;

import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/orders")
public class OrderController {
	private  UserClient userclient;
	public String getOrder(@PathVariable String orderId,@PathVariable String userId) {
		String userInfo = userclient.getUserInfo(userId);
		return "order#" + orderId + "placed by "  + userInfo;
	}
}
