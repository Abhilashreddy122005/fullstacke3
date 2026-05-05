package com.eventbooking.dto;

import lombok.Data;

@Data
public class AnnouncementRequest {
    private String subject;
    private String message;
    private String targetDepartment; // null = all
    private Integer targetYear;       // null = all
}
