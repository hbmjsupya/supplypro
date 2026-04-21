package com.supplypro.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class LogisticsResponse {
    @JsonAlias("Success")
    private boolean success;

    @JsonAlias("Reason")
    private String reason;

    @JsonAlias("State")
    private String state; // 0-无轨迹 1-已揽收 2-在途中 3-签收 4-问题件

    @JsonAlias("StateEx")
    private String stateEx; // 详细状态

    @JsonAlias("Location")
    private String location; // 当前位置

    @JsonAlias("DeliveryManTel")
    private String deliveryManTel; // 快递员电话

    @JsonAlias("EBusinessID")
    private String eBusinessID;

    @JsonAlias("LogisticCode")
    private String logisticCode;

    @JsonAlias("ShipperCode")
    private String shipperCode;

    @JsonAlias("ShipperName")
    private String shipperName;

    @JsonAlias("Traces")
    private List<Trace> traces;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Trace {
        @JsonAlias("AcceptTime")
        private String acceptTime;

        @JsonAlias("AcceptStation")
        private String acceptStation;

        @JsonAlias("Remark")
        private String remark;

        @JsonAlias("Location")
        private String location;

        @JsonAlias("Action")
        private String action;
    }
}
