package com.eventbooking.model;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.math.BigDecimal;
import java.time.LocalDate;

@Embeddable
public class ExpenseRecord {
    private String description;
    private BigDecimal amount;
    private String category;
    private LocalDate date;
    
    @Column(columnDefinition = "LONGTEXT")
    private String receiptBase64;

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal amount) { this.amount = amount; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public LocalDate getDate() { return date; }
    public void setDate(LocalDate date) { this.date = date; }
    public String getReceiptBase64() { return receiptBase64; }
    public void setReceiptBase64(String receiptBase64) { this.receiptBase64 = receiptBase64; }
}
