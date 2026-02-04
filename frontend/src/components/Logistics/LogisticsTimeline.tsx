import React from 'react';
import { Timeline, Card, Descriptions, Tag } from 'antd';
import { TruckOutlined, CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { LogisticsTrack } from '../../types/logistics';

interface LogisticsTimelineProps {
  tracks: LogisticsTrack[];
}

const LogisticsTimeline: React.FC<LogisticsTimelineProps> = ({ tracks }) => {
  if (!tracks || tracks.length === 0) {
    return <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>暂无物流信息</div>;
  }

  const latest = tracks[0];

  return (
    <div className="logistics-timeline">
      <Card 
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>物流详情 ({latest.logisticsProvider} - {latest.trackingNo})</span>
            <Tag color={latest.status === '已签收' ? 'green' : 'blue'}>{latest.status}</Tag>
          </div>
        }
        variant="borderless"
        className="mb-4"
      >
        <Timeline
          mode="left"
          items={tracks.map((track, index) => ({
            color: index === 0 ? 'green' : 'blue',
            dot: index === 0 ? <TruckOutlined style={{ fontSize: '16px' }} /> : <ClockCircleOutlined />,
            children: (
              <>
                <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{track.status}</div>
                <div style={{ color: '#666', marginBottom: 4 }}>{track.description}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>{track.eventTime}</div>
                {track.location && <div style={{ fontSize: '12px', color: '#999' }}>📍 {track.location}</div>}
              </>
            ),
          }))}
        />
      </Card>
    </div>
  );
};

export default LogisticsTimeline;
